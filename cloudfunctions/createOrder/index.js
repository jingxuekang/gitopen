// 云函数：创建订单
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function normalizeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildDefaultSpecValues(product = {}) {
  const values = []
  const addSpec = (label, value) => {
    if (value === undefined || value === null) return
    const text = String(value).trim()
    if (!text) return
    values.push(`${label}:${text}`)
  }

  if (product.category === 'teapot') {
    addSpec('壶型', product.subCategory)
    addSpec('泥料', product.material)
    addSpec('工艺', product.craftType || product.craft)
    addSpec('容量', product.capacity)
  } else if (product.category === 'chenpi') {
    addSpec('产区', product.subCategory || product.origin)
    addSpec('年份', product.year)
    addSpec('净含量', product.weight)
  } else {
    addSpec('品类', product.subCategory)
    addSpec('年份', product.year)
    addSpec('净含量', product.weight)
  }

  if (values.length === 0) values.push('默认规格:标准')
  return [...new Set(values)]
}

function getProductSkus(product = {}) {
  const basePrice = normalizeNumber(product.price, 0)
  const baseStock = normalizeNumber(product.stock, 0)
  const defaultSkuCode = `DEFAULT_${product._id || 'SKU'}`
  const sourceSkus = Array.isArray(product.skus) ? product.skus : []

  if (sourceSkus.length > 0) {
    return sourceSkus.map((sku, index) => ({
      ...sku,
      skuCode: sku && sku.skuCode ? sku.skuCode : `${defaultSkuCode}_${index}`,
      specValues: Array.isArray(sku && sku.specValues) && sku.specValues.length > 0
        ? sku.specValues
        : ['默认规格:标准'],
      price: normalizeNumber(sku && sku.price, basePrice),
      stock: normalizeNumber(sku && sku.stock, baseStock)
    }))
  }

  return [{
    skuCode: defaultSkuCode,
    specValues: buildDefaultSpecValues(product),
    price: basePrice,
    stock: baseStock
  }]
}

// 生成唯一订单号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${year}${month}${day}${hour}${minute}${second}${random}`
}

// 服务端会员价计算（防篡改）
function calculateMemberPrice(price, memberLevel) {
  if (!memberLevel || memberLevel === 0) return price
  if (memberLevel === 1) return Math.floor(price * 0.95)
  if (memberLevel === 2) return Math.floor(price * 0.9)
  return price
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  // 仅接收 items/address/userCouponId/remark，不接收金额字段，由服务端重算
  const { items, address, userCouponId, couponId, remark } = event
  const effectiveCouponId = userCouponId || couponId

  try {
    if (!items || items.length === 0) {
      return { success: false, message: '订单商品不能为空' }
    }
    if (!address) {
      return { success: false, message: '收货地址不能为空' }
    }

    // 获取用户会员等级（服务端查库，不信任前端）
    let memberLevel = 0
    try {
      const userResult = await db.collection('users').where({ openid: userId }).get()
      if (userResult.data.length > 0) {
        memberLevel = userResult.data[0].memberLevel || 0
      }
    } catch (e) {
      console.warn('获取会员等级失败，使用0:', e.message)
    }

    const transaction = await db.startTransaction()

    try {
      const normalizedItems = []
      let serverTotalAmount = 0

      for (const item of items) {
        const productResult = await transaction.collection('products').doc(item.productId).get()
        if (!productResult.data) {
          await transaction.rollback()
          return { success: false, message: `商品 ${item.productName || item.productId} 不存在` }
        }

        const product = productResult.data
        const skus = getProductSkus(product)
        const sku = skus.find(s => s.skuCode === item.skuCode) || skus[0]
        if (!sku) {
          await transaction.rollback()
          return { success: false, message: `商品 ${item.productName || item.productId} 的规格不存在` }
        }

        // 数量必须为正整数
        const quantity = Math.max(1, Math.floor(normalizeNumber(item.quantity, 1)))
        if (quantity !== normalizeNumber(item.quantity, 1) || quantity < 1) {
          await transaction.rollback()
          return { success: false, message: '商品数量必须为正整数' }
        }

        if (sku.stock < quantity) {
          await transaction.rollback()
          return { success: false, message: `商品 ${item.productName || item.productId} 库存不足，当前库存：${sku.stock}` }
        }

        const hasRealSkus = Array.isArray(product.skus) && product.skus.length > 0
        const skuIndex = hasRealSkus ? product.skus.findIndex(s => s.skuCode === sku.skuCode) : -1

        if (hasRealSkus && skuIndex !== -1) {
          await transaction.collection('products').doc(item.productId).update({
            data: { [`skus.${skuIndex}.stock`]: _.inc(-quantity) }
          })
        } else {
          await transaction.collection('products').doc(item.productId).update({
            data: { stock: _.inc(-quantity) }
          })
        }

        const unitPrice = normalizeNumber(sku.price, 0)
        const memberUnitPrice = calculateMemberPrice(unitPrice, memberLevel)
        const subtotal = memberUnitPrice * quantity
        serverTotalAmount += subtotal

        normalizedItems.push({
          ...item,
          skuCode: item.skuCode || sku.skuCode,
          specText: item.specText || (Array.isArray(sku.specValues) ? sku.specValues.join(' ') : '默认规格'),
          price: unitPrice,
          quantity,
          subtotal
        })
      }

      // 服务端重算：会员折扣
      const rawTotal = normalizedItems.reduce((s, i) => s + normalizeNumber(i.price, 0) * i.quantity, 0)
      const memberDiscountedTotal = normalizedItems.reduce((s, i) => {
        const mp = calculateMemberPrice(normalizeNumber(i.price, 0), memberLevel)
        return s + mp * i.quantity
      }, 0)
      const memberDiscount = Math.max(0, rawTotal - memberDiscountedTotal)

      // 服务端重算：优惠券
      let discountAmount = 0
      let couponDocId = null
      if (effectiveCouponId) {
        const couponResult = await transaction.collection('user_coupons')
          .where({ _id: effectiveCouponId, userId, status: 0 })
          .get()
        if (couponResult.data.length === 0) {
          await transaction.rollback()
          return { success: false, message: '优惠券不可用或已使用' }
        }
        const userCoupon = couponResult.data[0]
        const couponRes = await transaction.collection('coupons').doc(userCoupon.couponId).get()
        const coupon = couponRes.data
        if (!coupon) {
          await transaction.rollback()
          return { success: false, message: '优惠券不存在' }
        }
        const now = new Date()
        if (now > new Date(coupon.validTo)) {
          await transaction.rollback()
          return { success: false, message: '优惠券已过期' }
        }
        if (memberDiscountedTotal < (coupon.minAmount || 0)) {
          await transaction.rollback()
          return { success: false, message: `未满${((coupon.minAmount || 0) / 100).toFixed(0)}元不可用` }
        }
        if (coupon.type === 1) {
          discountAmount = Math.min(normalizeNumber(coupon.value, 0), memberDiscountedTotal)
        } else if (coupon.type === 2) {
          discountAmount = Math.floor(memberDiscountedTotal * (100 - normalizeNumber(coupon.value, 0)) / 100)
        }
        couponDocId = effectiveCouponId
        await transaction.collection('user_coupons').doc(effectiveCouponId).update({
          data: { status: 1, usedAt: new Date() }
        })
      }

      const payAmount = Math.max(0, memberDiscountedTotal - discountAmount)

      const orderNo = generateOrderNo()
      const orderData = {
        orderNo,
        userId,
        items: normalizedItems.map((i) => ({
          ...i,
          reviewed: false,
          reviewedAt: null,
          reviewId: ''
        })),
        totalAmount: rawTotal,
        memberDiscount,
        discountAmount,
        payAmount,
        couponId: couponDocId,
        memberLevel,
        address,
        status: 0,
        paymentStatus: 0,
        remark: remark || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const orderResult = await transaction.collection('orders').add({
        data: orderData
      })

      // 5. 如果使用了优惠券，更新订单ID
      if (couponDocId) {
        await transaction.collection('user_coupons').doc(couponDocId).update({
          data: { orderId: orderResult._id }
        })
      }

      // 6. 如果是从购物车结算，删除购物车中的商品
      const cartItemIds = items.map(item => item.cartItemId).filter(id => id)
      if (cartItemIds.length > 0) {
        await transaction.collection('cart_items')
          .where({
            _id: _.in(cartItemIds),
            userId: userId
          })
          .remove()
      }

      // 提交事务
      await transaction.commit()

      return {
        success: true,
        data: {
          orderId: orderResult._id,
          orderNo: orderNo
        },
        message: '订单创建成功'
      }

    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback()
      throw transactionError
    }

  } catch (error) {
    console.error('创建订单失败:', error)
    return {
      success: false,
      message: '创建订单失败',
      error: error.message
    }
  }
}
