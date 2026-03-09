// 云函数：获取订单列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { status, page = 1, pageSize = 10 } = event

  try {
    // 构建查询条件
    const where = { userId }
    
    // 如果指定了状态，添加状态筛选
    if (status !== undefined && status !== null && status !== 'all') {
      where.status = parseInt(status)
    }

    // 查询订单总数
    const countResult = await db.collection('orders')
      .where(where)
      .count()

    // 查询订单列表
    const ordersResult = await db.collection('orders')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: {
        orders: ordersResult.data,
        total: countResult.total,
        page,
        pageSize,
        hasMore: page * pageSize < countResult.total
      }
    }

  } catch (error) {
    console.error('获取订单列表失败:', error)
    return {
      success: false,
      message: '获取订单列表失败',
      error: error.message
    }
  }
}
