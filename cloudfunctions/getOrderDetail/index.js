// 云函数：获取订单详情
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

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
        message: '无权访问此订单'
      }
    }

    return {
      success: true,
      data: order
    }

  } catch (error) {
    console.error('获取订单详情失败:', error)
    return {
      success: false,
      message: '获取订单详情失败',
      error: error.message
    }
  }
}
