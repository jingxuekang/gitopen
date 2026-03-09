// 云函数：领取优惠券
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { couponId } = event

  if (!couponId) {
    return {
      success: false,
      message: '缺少优惠券ID'
    }
  }

  try {
    // 查询优惠券
    const couponResult = await db.collection('coupons').doc(couponId).get()
    
    if (!couponResult.data) {
      return {
        success: false,
        message: '优惠券不存在'
      }
    }

    const coupon = couponResult.data
    const now = new Date()

    // 检查优惠券状态
    if (coupon.status !== 1) {
      return {
        success: false,
        message: '优惠券已结束'
      }
    }

    // 检查有效期
    if (now < coupon.validFrom || now > coupon.validTo) {
      return {
        success: false,
        message: '不在优惠券有效期内'
      }
    }

    // 检查库存
    if (coupon.claimed >= coupon.total) {
      return {
        success: false,
        message: '优惠券已被领完'
      }
    }

    // 检查是否已领取
    const existingCoupon = await db.collection('user_coupons')
      .where({
        userId: userId,
        couponId: couponId
      })
      .get()

    if (existingCoupon.data.length > 0) {
      return {
        success: false,
        message: '您已领取过该优惠券'
      }
    }

    // 开始事务
    const transaction = await db.startTransaction()

    try {
      // 1. 创建用户优惠券记录
      await transaction.collection('user_coupons').add({
        data: {
          userId: userId,
          couponId: couponId,
          status: 0, // 未使用
          claimedAt: now
        }
      })

      // 2. 更新优惠券已领取数量
      await transaction.collection('coupons').doc(couponId).update({
        data: {
          claimed: _.inc(1)
        }
      })

      // 提交事务
      await transaction.commit()

      return {
        success: true,
        message: '领取成功'
      }

    } catch (transactionError) {
      await transaction.rollback()
      throw transactionError
    }

  } catch (error) {
    console.error('领取优惠券失败:', error)
    return {
      success: false,
      message: '领取优惠券失败',
      error: error.message
    }
  }
}
