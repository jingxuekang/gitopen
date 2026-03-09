// 云函数：参与拼团
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { groupId, orderId } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  if (!groupId || !orderId) {
    return {
      success: false,
      message: '缺少必要参数'
    }
  }

  try {
    // 查询拼团记录
    const groupResult = await db.collection('groups').doc(groupId).get()
    
    if (!groupResult.data) {
      return {
        success: false,
        message: '拼团不存在'
      }
    }

    const group = groupResult.data
    const now = new Date()

    // 验证拼团状态
    if (group.status !== 0) {
      return {
        success: false,
        message: group.status === 1 ? '拼团已成功' : '拼团已失败'
      }
    }

    // 验证是否过期
    if (now > new Date(group.expireAt)) {
      return {
        success: false,
        message: '拼团已过期'
      }
    }

    // 验证是否已满员
    if (group.currentCount >= group.requiredCount) {
      return {
        success: false,
        message: '拼团已满员'
      }
    }

    // 验证用户是否已参团
    const alreadyJoined = group.members.some(member => member.userId === userId)
    if (alreadyJoined) {
      return {
        success: false,
        message: '您已参与该拼团'
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

    // 查询拼团活动
    const activityResult = await db.collection('group_activities').doc(group.activityId).get()
    
    if (!activityResult.data) {
      return {
        success: false,
        message: '拼团活动不存在'
      }
    }

    const activity = activityResult.data

    // 验证活动库存
    if (activity.stock <= 0) {
      return {
        success: false,
        message: '拼团库存不足'
      }
    }

    // 添加成员到拼团
    const newMember = {
      userId: userId,
      orderId: orderId,
      joinedAt: now
    }

    const newCurrentCount = group.currentCount + 1
    const isGroupComplete = newCurrentCount >= group.requiredCount

    // 更新拼团记录
    const updateData = {
      members: _.push(newMember),
      currentCount: newCurrentCount,
      updatedAt: now
    }

    // 如果拼团成功，更新状态
    if (isGroupComplete) {
      updateData.status = 1 // 拼团成功
    }

    await db.collection('groups').doc(groupId).update({
      data: updateData
    })

    // 更新订单的拼团信息
    await db.collection('orders').doc(orderId).update({
      data: {
        groupId: groupId,
        isGroupLeader: false,
        updatedAt: now
      }
    })

    // 扣减拼团库存
    await db.collection('group_activities').doc(group.activityId).update({
      data: {
        stock: _.inc(-1),
        updatedAt: now
      }
    })

    // 如果拼团成功，发送通知给所有成员
    if (isGroupComplete) {
      try {
        // 获取所有成员的订单ID
        const allMembers = [...group.members, newMember]
        
        // 这里可以调用微信模板消息接口发送通知
        // 由于需要配置模板消息，这里仅记录日志
        console.log('拼团成功，需要通知成员:', allMembers.map(m => m.userId))
        
        // TODO: 发送模板消息通知所有成员拼团成功
        // await sendGroupSuccessNotification(allMembers)
      } catch (error) {
        console.error('发送拼团成功通知失败:', error)
      }
    }

    return {
      success: true,
      data: {
        groupId: groupId,
        currentCount: newCurrentCount,
        isComplete: isGroupComplete
      },
      message: isGroupComplete ? '拼团成功！' : '参团成功'
    }

  } catch (error) {
    console.error('参与拼团失败:', error)
    return {
      success: false,
      message: '参与拼团失败',
      error: error.message
    }
  }
}
