// 云函数：获取拼团活动列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { page = 1, pageSize = 10 } = event

  try {
    const now = new Date()

    // 查询进行中的拼团活动
    const activitiesResult = await db.collection('group_activities')
      .where({
        status: 1, // 进行中
        validFrom: _.lte(now),
        validTo: _.gte(now),
        stock: _.gt(0)
      })
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 获取商品信息
    const activities = await Promise.all(
      activitiesResult.data.map(async (activity) => {
        try {
          const productResult = await db.collection('products').doc(activity.productId).get()
          return {
            ...activity,
            productInfo: productResult.data || null
          }
        } catch (error) {
          return {
            ...activity,
            productInfo: null
          }
        }
      })
    )

    // 查询总数
    const countResult = await db.collection('group_activities')
      .where({
        status: 1,
        validFrom: _.lte(now),
        validTo: _.gte(now),
        stock: _.gt(0)
      })
      .count()

    return {
      success: true,
      data: {
        activities: activities,
        total: countResult.total,
        hasMore: page * pageSize < countResult.total
      }
    }

  } catch (error) {
    console.error('获取拼团活动失败:', error)
    return {
      success: false,
      message: '获取拼团活动失败',
      error: error.message
    }
  }
}
