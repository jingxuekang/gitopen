// 云函数：定时检查过期拼团
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const now = new Date()
    console.log('开始检查过期拼团:', now)

    // 查询所有过期且状态为拼团中的记录
    const expiredGroupsResult = await db.collection('groups')
      .where({
        status: 0, // 拼团中
        expireAt: _.lt(now)
      })
      .get()

    const expiredGroups = expiredGroupsResult.data
    console.log(`找到 ${expiredGroups.length} 个过期拼团`)

    if (expiredGroups.length === 0) {
      return {
        success: true,
        message: '没有过期的拼团',
        data: {
          processedCount: 0
        }
      }
    }

    let successCount = 0
    let failCount = 0

    // 处理每个过期的拼团
    for (const group of expiredGroups) {
      try {
        console.log(`处理过期拼团: ${group._id}`)

        // 更新拼团状态为失败
        await db.collection('groups').doc(group._id).update({
          data: {
            status: 2, // 拼团失败
            updatedAt: now
          }
        })

        // 恢复拼团活动库存
        await db.collection('group_activities').doc(group.activityId).update({
          data: {
            stock: _.inc(group.currentCount),
            updatedAt: now
          }
        })

        // 处理所有参团订单的退款
        for (const member of group.members) {
          try {
            // 查询订单
            const orderResult = await db.collection('orders').doc(member.orderId).get()
            
            if (orderResult.data) {
              const order = orderResult.data

              // 更新订单状态为已取消（拼团失败）
              await db.collection('orders').doc(member.orderId).update({
                data: {
                  status: 4, // 已取消
                  cancelReason: '拼团失败，自动退款',
                  updatedAt: now
                }
              })

              // 恢复商品库存
              for (const item of order.items) {
                await db.collection('products').doc(item.productId).update({
                  data: {
                    stock: _.inc(item.quantity)
                  }
                })
              }

              // 如果使用了优惠券，退还优惠券
              if (order.couponId) {
                await db.collection('user_coupons')
                  .where({
                    userId: order.userId,
                    couponId: order.couponId,
                    orderId: member.orderId
                  })
                  .update({
                    data: {
                      status: 0, // 未使用
                      usedAt: _.remove(),
                      orderId: _.remove()
                    }
                  })
              }

              console.log(`订单 ${member.orderId} 已处理退款`)

              // TODO: 调用微信支付退款接口
              // 这里需要调用微信支付的退款API
              // const refundResult = await refundPayment(order)
              
              // TODO: 发送退款通知给用户
              // await sendRefundNotification(order.userId, order.orderNo)
            }
          } catch (orderError) {
            console.error(`处理订单 ${member.orderId} 失败:`, orderError)
          }
        }

        successCount++
        console.log(`拼团 ${group._id} 处理完成`)

      } catch (groupError) {
        console.error(`处理拼团 ${group._id} 失败:`, groupError)
        failCount++
      }
    }

    return {
      success: true,
      message: `过期拼团处理完成`,
      data: {
        totalCount: expiredGroups.length,
        successCount: successCount,
        failCount: failCount
      }
    }

  } catch (error) {
    console.error('检查过期拼团失败:', error)
    return {
      success: false,
      message: '检查过期拼团失败',
      error: error.message
    }
  }
}
