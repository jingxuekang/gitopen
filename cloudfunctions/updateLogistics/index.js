// 云函数：更新物流信息（管理员）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 管理员白名单
const ADMIN_OPENIDS = [
  'oXXXX-admin-openid-1',
  'oXXXX-admin-openid-2'
]

function requireAdmin(wxContext) {
  if (!wxContext || !wxContext.OPENID) {
    return { ok: false, body: { code: 401, message: '未授权' } }
  }
  if (!ADMIN_OPENIDS.includes(wxContext.OPENID)) {
    return { ok: false, body: { code: 403, message: '无权限' } }
  }
  return { ok: true }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const adminCheck = requireAdmin(wxContext)
  if (!adminCheck.ok) {
    return adminCheck.body
  }

  const { orderId, company, trackingNo } = event

  // 参数验证
  if (!orderId || !company || !trackingNo) {
    return {
      success: false,
      message: '缺少必要参数'
    }
  }

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

    // 检查订单状态
    if (order.status !== 1) {
      return {
        success: false,
        message: '订单状态不正确，只有待发货订单可以更新物流'
      }
    }

    // 更新订单物流信息和状态
    await db.collection('orders').doc(orderId).update({
      data: {
        logistics: {
          company,
          trackingNo
        },
        status: 2, // 待收货
        deliveryTime: new Date(),
        updatedAt: new Date()
      }
    })

    // 发送发货通知
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: order.userId,
        page: `pages/order/detail/detail?orderId=${orderId}`,
        data: {
          character_string1: { value: order.orderNo },
          thing2: { value: company },
          character_string3: { value: trackingNo },
          date4: { value: new Date().toLocaleString('zh-CN') }
        },
        templateId: 'YOUR_DELIVERY_TEMPLATE_ID',
        miniprogramState: 'formal'
      })
    } catch (msgError) {
      console.error('发送通知失败:', msgError)
    }

    return {
      success: true,
      message: '物流信息更新成功'
    }

  } catch (error) {
    console.error('更新物流信息失败:', error)
    return {
      success: false,
      message: '更新物流信息失败',
      error: error.message
    }
  }
}
