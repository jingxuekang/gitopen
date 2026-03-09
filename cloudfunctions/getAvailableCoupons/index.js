// 云函数：获取订单可用优惠券
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const getErrorText = (err) => {
  return [
    err && err.message,
    err && err.errMsg,
    err && err.error
  ].filter(Boolean).join(' | ')
}

const isMissingCouponCollection = (err) => {
  const text = getErrorText(err)
  return text.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    text.includes('collection not exists') ||
    text.includes('user_coupons') ||
    text.includes('coupons')
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const totalAmount = Number(event.totalAmount || event.amount || 0)

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return {
      success: false,
      message: '缺少订单金额'
    }
  }

  try {
    // 查询用户未使用的优惠券
    const userCouponsResult = await db.collection('user_coupons')
      .where({
        userId: userId,
        status: 0 // 未使用
      })
      .get()

    // 获取优惠券详情并判断是否可用
    const now = new Date()
    const coupons = await Promise.all(
      userCouponsResult.data.map(async (userCoupon) => {
        try {
          const couponResult = await db.collection('coupons').doc(userCoupon.couponId).get()
          const coupon = couponResult.data

          if (!coupon) {
            return null
          }

          // 检查是否过期
          if (now > coupon.validTo) {
            return {
              ...userCoupon,
              couponInfo: coupon,
              available: false,
              reason: '已过期'
            }
          }

          // 检查是否满足最低消费
          if (totalAmount < coupon.minAmount) {
            return {
              ...userCoupon,
              couponInfo: coupon,
              available: false,
              reason: `满${(coupon.minAmount / 100).toFixed(0)}元可用`
            }
          }

          // 可用
          return {
            ...userCoupon,
            couponInfo: coupon,
            available: true
          }

        } catch (error) {
          return null
        }
      })
    )

    // 过滤掉null值并排序（可用的在前）
    const validCoupons = coupons
      .filter(c => c !== null)
      .sort((a, b) => {
        if (a.available && !b.available) return -1
        if (!a.available && b.available) return 1
        return 0
      })

    return {
      code: 0,
      success: true,
      data: validCoupons,
      message: '获取成功'
    }

  } catch (error) {
    console.error('获取可用优惠券失败:', error)
    if (isMissingCouponCollection(error)) {
      return {
        success: true,
        data: []
      }
    }
    return {
      success: false,
      message: '获取可用优惠券失败',
      error: error.message
    }
  }
}
