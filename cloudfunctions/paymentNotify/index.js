// 云函数：支付回调通知
// 注意：应配置为微信支付平台回调触发，避免被直接调用伪造。生产环境需接入验签流程。
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  console.log('支付回调:', event)

  const { returnCode, resultCode, outTradeNo, transactionId, totalFee, cashFee } = event

  try {
    if (returnCode !== 'SUCCESS' || resultCode !== 'SUCCESS') {
      console.error('支付失败:', event)
      return { errcode: 0, errmsg: 'FAIL' }
    }

    if (!outTradeNo || !transactionId) {
      console.error('回调缺少必要字段:', event)
      return { errcode: 0, errmsg: 'FAIL' }
    }

    const orderResult = await db.collection('orders')
      .where({ orderNo: outTradeNo })
      .get()

    if (orderResult.data.length === 0) {
      console.error('订单不存在:', outTradeNo)
      return { errcode: 0, errmsg: 'FAIL' }
    }

    const order = orderResult.data[0]

    // 幂等：已支付直接返回成功，避免重复处理
    if (order.paymentStatus === 1) {
      return { errcode: 0, errmsg: 'SUCCESS' }
    }

    // 金额校验：回调中的支付金额需与订单待付金额一致，防篡改
    const callbackAmount = Number(totalFee || cashFee || 0)
    const orderPayAmount = Number(order.payAmount) || 0
    if (callbackAmount > 0 && orderPayAmount > 0 && callbackAmount !== orderPayAmount) {
      console.error('支付金额不一致', { callbackAmount, orderPayAmount, orderNo: outTradeNo })
      return { errcode: 0, errmsg: 'FAIL' }
    }

    // 开始事务
    const transaction = await db.startTransaction()

    try {
      // 1. 更新订单状态
      await transaction.collection('orders').doc(order._id).update({
        data: {
          status: 1, // 待发货
          paymentStatus: 1, // 已支付
          paymentTime: new Date(),
          transactionId: transactionId,
          updatedAt: new Date()
        }
      })

      // 2. 扣减商品库存（从锁定库存转为实际扣减）
      // 注意：在创建订单时已经锁定了库存，这里不需要再次扣减
      // 如果需要区分锁定库存和实际库存，可以在这里处理

      // 3. 更新用户累计消费
      await transaction.collection('users')
        .where({
          openid: order.userId
        })
        .update({
          data: {
            totalSpent: _.inc(order.payAmount)
          }
        })

      // 4. 如果使用了优惠券，确认优惠券已使用
      if (order.couponId) {
        await transaction.collection('user_coupons').doc(order.couponId).update({
          data: {
            status: 1, // 已使用
            usedAt: new Date(),
            orderId: order._id
          }
        })
      }

      // 提交事务
      await transaction.commit()

      console.log('支付成功，订单已更新:', order.orderNo)

      // 发送订单支付成功的模板消息（可选）
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: order.userId,
          page: `pages/order/detail/detail?orderId=${order._id}`,
          data: {
            thing1: { value: '订单支付成功' },
            amount2: { value: `¥${(order.payAmount / 100).toFixed(2)}` },
            date3: { value: new Date().toLocaleString('zh-CN') }
          },
          templateId: 'YOUR_TEMPLATE_ID', // 需要在微信公众平台配置
          miniprogramState: 'formal'
        })
      } catch (msgError) {
        console.error('发送模板消息失败:', msgError)
        // 消息发送失败不影响支付流程
      }

      // 检查并更新会员等级
      try {
        const memberLevelResult = await cloud.callFunction({
          name: 'updateMemberLevel',
          data: {
            userId: order.userId
          }
        })
        
        if (memberLevelResult.result.code === 0 && memberLevelResult.result.data.upgraded) {
          console.log('会员等级已升级:', memberLevelResult.result.data)
        }
      } catch (memberError) {
        console.error('更新会员等级失败:', memberError)
        // 会员等级更新失败不影响支付流程
      }

      return {
        errcode: 0,
        errmsg: 'SUCCESS'
      }

    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback()
      console.error('更新订单失败，事务已回滚:', transactionError)
      throw transactionError
    }

  } catch (error) {
    console.error('支付回调处理失败:', error)
    return {
      errcode: -1,
      errmsg: 'FAIL'
    }
  }
}
