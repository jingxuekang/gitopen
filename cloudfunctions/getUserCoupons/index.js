// 云函数：获取用户优惠券列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { status } = event // 0-未使用 1-已使用 2-已过期

  try {
    // 构建查询条件
    const where = { userId: userId }
    if (status !== undefined) {
      where.status = status
    }

    // 查询用户优惠券
    const userCouponsResult = await db.collection('user_coupons')
      .where(where)
      .orderBy('claimedAt', 'desc')
      .get()

    // 获取优惠券详情
    const userCoupons = await Promise.all(
      userCouponsResult.data.map(async (userCoupon) => {
        try {
          const couponResult = await db.collection('coupons').doc(userCoupon.couponId).get()
          return {
            ...userCoupon,
            couponInfo: couponResult.data || null
          }
        } catch (error) {
          return {
            ...userCoupon,
            couponInfo: null
          }
        }
      })
    )

    // 检查并更新过期优惠券
    const now = new Date()
    const updatePromises = []

    userCoupons.forEach(userCoupon => {
      if (userCoupon.status === 0 && userCoupon.couponInfo && now > userCoupon.couponInfo.validTo) {
        updatePromises.push(
          db.collection('user_coupons').doc(userCoupon._id).update({
            data: { status: 2 }
          })
        )
        userCoupon.status = 2
      }
    })

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }

    return {
      success: true,
      data: userCoupons
    }

  } catch (error) {
    console.error('获取用户优惠券失败:', error)
    return {
      success: false,
      message: '获取用户优惠券失败',
      error: error.message
    }
  }
}
