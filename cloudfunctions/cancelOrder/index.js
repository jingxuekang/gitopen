// 云函数：取消订单
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function hasRealSkus(product) {
  return !!(product && Array.isArray(product.skus) && product.skus.length > 0)
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { orderId } = event

  try {
    // 查询订单
    const orderResult = await db.collection('orders').doc(orderId).get()

    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    // 验证订单所属用户
    if (order.userId !== userId) {
      return {
        success: false,
        message: '无权操作此订单'
      }
    }

    // 只有待付款的订单可以取消
    if (order.status !== 0) {
      return {
        success: false,
        message: '订单状态不允许取消'
      }
    }

    // 开始事务
    const transaction = await db.startTransaction()

    try {
      // 1. 更新订单状态
      await transaction.collection('orders').doc(orderId).update({
        data: {
          status: 4, // 已取消
          updatedAt: new Date()
        }
      })

      // 2. 释放库存
      for (const item of order.items) {
        const productResult = await transaction.collection('products').doc(item.productId).get()
        
        if (productResult.data) {
          const product = productResult.data
          const quantity = Number(item.quantity) || 0
          const skuIndex = hasRealSkus(product)
            ? product.skus.findIndex(s => s.skuCode === item.skuCode)
            : -1

          if (skuIndex !== -1) {
            await transaction.collection('products').doc(item.productId).update({
              data: {
                [`skus.${skuIndex}.stock`]: _.inc(quantity)
              }
            })
          } else {
            await transaction.collection('products').doc(item.productId).update({
              data: {
                stock: _.inc(quantity)
              }
            })
          }
        }
      }

      // 3. 如果使用了优惠券，退还优惠券
      if (order.couponId) {
        await transaction.collection('user_coupons').doc(order.couponId).update({
          data: {
            status: 0, // 未使用
            usedAt: null,
            orderId: null
          }
        })
      }

      // 提交事务
      await transaction.commit()

      return {
        success: true,
        message: '订单已取消'
      }

    } catch (transactionError) {
      await transaction.rollback()
      throw transactionError
    }

  } catch (error) {
    console.error('取消订单失败:', error)
    return {
      success: false,
      message: '取消订单失败',
      error: error.message
    }
  }
}
