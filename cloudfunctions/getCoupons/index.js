// 云函数：获取可领取优惠券列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const now = new Date()

    // 查询进行中的优惠券
    const couponsResult = await db.collection('coupons')
      .where({
        status: 1, // 进行中
        validFrom: _.lte(now),
        validTo: _.gte(now)
      })
      .orderBy('createdAt', 'desc')
      .get()

    return {
      success: true,
      data: couponsResult.data
    }

  } catch (error) {
    console.error('获取优惠券列表失败:', error)
    return {
      success: false,
      message: '获取优惠券列表失败',
      error: error.message
    }
  }
}
