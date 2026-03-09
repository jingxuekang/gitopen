// 云函数：确认收货
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
        message: '无权操作此订单'
      }
    }

    // 只有待收货的订单可以确认收货
    if (order.status !== 2) {
      return {
        success: false,
        message: '订单状态不允许确认收货'
      }
    }

    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 3, // 已完成
        receiveTime: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      success: true,
      message: '确认收货成功'
    }

  } catch (error) {
    console.error('确认收货失败:', error)
    return {
      success: false,
      message: '确认收货失败',
      error: error.message
    }
  }
}
