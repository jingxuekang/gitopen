// 云函数：提交商品评价
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function normalizeSkuCode(skuCode) {
  return typeof skuCode === 'string' ? skuCode : ''
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  const {
    orderId,
    productId,
    rating,
    content,
    images = [],
    skuCode: rawSkuCode
  } = event

  const normalizedRating = Number(rating)
  const skuCode = normalizeSkuCode(rawSkuCode)
  const reviewContent = typeof content === 'string' ? content.trim() : ''
  const safeImages = Array.isArray(images)
    ? images.filter(item => typeof item === 'string')
    : []

  if (!orderId || !productId || !Number.isFinite(normalizedRating)) {
    return {
      success: false,
      message: '缺少必要参数'
    }
  }

  if (normalizedRating < 1 || normalizedRating > 5) {
    return {
      success: false,
      message: '评分必须在1-5之间'
    }
  }

  if (reviewContent.length > 500) {
    return {
      success: false,
      message: '评价内容不能超过500字'
    }
  }

  try {
    // 1. 订单校验（只允许当前用户评价自己的已完成订单）
    const orderResult = await db.collection('orders')
      .where({
        _id: orderId,
        userId
      })
      .limit(1)
      .get()

    if (!orderResult.data || orderResult.data.length === 0) {
      return {
        success: false,
        message: '订单不存在或无权限'
      }
    }

    const order = orderResult.data[0]

    if (order.status !== 3) {
      return {
        success: false,
        message: '只有已完成的订单可以评价'
      }
    }

    const orderItems = Array.isArray(order.items) ? order.items : []

    let targetIndex = orderItems.findIndex(item => {
      return item.productId === productId && normalizeSkuCode(item.skuCode) === skuCode
    })

    // 兼容旧数据：历史订单可能没有 skuCode
    if (targetIndex < 0 && !skuCode) {
      targetIndex = orderItems.findIndex(item => item.productId === productId)
    }

    if (targetIndex < 0) {
      return {
        success: false,
        message: '该商品不在订单中'
      }
    }

    const targetItem = orderItems[targetIndex]
    const targetSkuCode = normalizeSkuCode(targetItem.skuCode)

    if (targetItem.reviewed === true) {
      return {
        success: false,
        message: '该商品已评价，不能重复评价'
      }
    }

    // 2. 防重复校验（兼容旧评价数据）
    const existingReviewResult = await db.collection('reviews')
      .where({
        orderId,
        productId,
        userId
      })
      .get()

    const hasDuplicate = (existingReviewResult.data || []).some(review => {
      return normalizeSkuCode(review.skuCode) === targetSkuCode
    })

    if (hasDuplicate) {
      return {
        success: false,
        message: '该商品已评价，不能重复评价'
      }
    }

    const now = new Date()

    const reviewPayload = {
      orderId,
      orderNo: order.orderNo || '',
      userId,
      productId,
      skuCode: targetSkuCode,
      productName: targetItem.productName || '',
      productImage: targetItem.productImage || '',
      specText: targetItem.specText || '',
      quantity: targetItem.quantity || 1,
      rating: normalizedRating,
      content: reviewContent,
      images: safeImages,
      createdAt: now,
      updatedAt: now
    }

    // 可选：保存评价时的用户快照，后续展示更稳定
    try {
      const userResult = await db.collection('users')
        .where({ openid: userId })
        .limit(1)
        .field({ nickname: true, avatar: true })
        .get()

      if (userResult.data && userResult.data[0]) {
        reviewPayload.userSnapshot = {
          nickname: userResult.data[0].nickname || '匿名用户',
          avatar: userResult.data[0].avatar || ''
        }
      }
    } catch (userErr) {
      console.warn('读取用户快照失败，忽略：', userErr)
    }

    // 3. 事务：新增评价 + 更新商品评分 + 标记订单项已评价
    const transaction = await db.startTransaction()

    try {
      const reviewResult = await transaction.collection('reviews').add({
        data: reviewPayload
      })
      const reviewId = reviewResult._id

      const productResult = await transaction.collection('products').doc(productId).get()

      if (productResult && productResult.data) {
        const product = productResult.data
        const currentRating = Number(product.rating) || 0
        const currentCount = Number(product.reviewCount) || 0
        const newCount = currentCount + 1
        const newRating = ((currentRating * currentCount) + normalizedRating) / newCount

        await transaction.collection('products').doc(productId).update({
          data: {
            rating: Number(newRating.toFixed(2)),
            reviewCount: newCount,
            updatedAt: now
          }
        })
      }

      const updatedItems = orderItems.map((item, index) => {
        if (index !== targetIndex) {
          return item
        }

        return {
          ...item,
          reviewed: true,
          reviewedAt: now,
          reviewId
        }
      })

      const allReviewed = updatedItems.length > 0 && updatedItems.every(item => item.reviewed === true)

      await transaction.collection('orders').doc(orderId).update({
        data: {
          items: updatedItems,
          reviewed: allReviewed,
          updatedAt: now
        }
      })

      await transaction.commit()

      return {
        success: true,
        message: '评价成功',
        data: {
          reviewId,
          orderId,
          productId,
          skuCode: targetSkuCode,
          allReviewed
        }
      }
    } catch (transactionError) {
      await transaction.rollback()
      throw transactionError
    }
  } catch (error) {
    console.error('提交评价失败:', error)
    return {
      success: false,
      message: '提交评价失败',
      error: error.message
    }
  }
}
