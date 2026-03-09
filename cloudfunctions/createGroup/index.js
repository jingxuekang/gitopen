// 云函数：发起拼团
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { activityId, orderId } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  if (!activityId || !orderId) {
    return {
      success: false,
      message: '缺少必要参数'
    }
  }

  try {
    // 查询拼团活动
    const activityResult = await db.collection('group_activities').doc(activityId).get()
    
    if (!activityResult.data) {
      return {
        success: false,
        message: '拼团活动不存在'
      }
    }

    const activity = activityResult.data
    const now = new Date()

    // 验证活动状态
    if (activity.status !== 1) {
      return {
        success: false,
        message: '拼团活动未开始或已结束'
      }
    }

    if (now < activity.validFrom || now > activity.validTo) {
      return {
        success: false,
        message: '拼团活动不在有效期内'
      }
    }

    if (activity.stock <= 0) {
      return {
        success: false,
        message: '拼团库存不足'
      }
    }

    // 验证订单
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    if (order.userId !== userId) {
      return {
        success: false,
        message: '无权操作此订单'
      }
    }

    if (order.paymentStatus !== 1) {
      return {
        success: false,
        message: '订单未支付'
      }
    }

    // 检查用户是否已经在其他进行中的拼团
    const existingGroupResult = await db.collection('groups')
      .where({
        activityId: activityId,
        status: 0, // 拼团中
        'members.userId': userId
      })
      .get()

    if (existingGroupResult.data.length > 0) {
      return {
        success: false,
        message: '您已参与该商品的拼团，不能重复发起'
      }
    }

    // 计算过期时间
    const expireAt = new Date(now.getTime() + activity.duration * 60 * 60 * 1000)

    // 创建拼团记录
    const groupData = {
      activityId: activityId,
      leaderId: userId,
      status: 0, // 拼团中
      currentCount: 1,
      requiredCount: activity.requiredCount,
      members: [{
        userId: userId,
        orderId: orderId,
        joinedAt: now
      }],
      expireAt: expireAt,
      createdAt: now,
      updatedAt: now
    }

    const groupResult = await db.collection('groups').add({
      data: groupData
    })

    // 更新订单的拼团信息
    await db.collection('orders').doc(orderId).update({
      data: {
        groupId: groupResult._id,
        isGroupLeader: true,
        updatedAt: now
      }
    })

    // 扣减拼团库存
    await db.collection('group_activities').doc(activityId).update({
      data: {
        stock: _.inc(-1),
        updatedAt: now
      }
    })

    return {
      success: true,
      data: {
        groupId: groupResult._id,
        group: groupData
      },
      message: '拼团发起成功'
    }

  } catch (error) {
    console.error('发起拼团失败:', error)
    return {
      success: false,
      message: '发起拼团失败',
      error: error.message
    }
  }
}
