// 云函数：检查超时未支付订单
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function hasRealSkus(product) {
  return !!(product && Array.isArray(product.skus) && product.skus.length > 0)
}

exports.main = async (event, context) => {
  console.log('开始检查超时订单...')

  try {
    // 计算30分钟前的时间
    const expireTime = new Date(Date.now() - 30 * 60 * 1000)

    // 查询超时未支付的订单
    const ordersResult = await db.collection('orders')
      .where({
        status: 0, // 待付款
        paymentStatus: 0, // 未支付
        createdAt: _.lt(expireTime) // 创建时间早于30分钟前
      })
      .get()

    const expiredOrders = ordersResult.data
    console.log(`找到 ${expiredOrders.length} 个超时订单`)

    if (expiredOrders.length === 0) {
      return {
        success: true,
        message: '没有超时订单',
        data: {
          count: 0
        }
      }
    }

    // 处理每个超时订单
    let successCount = 0
    let failCount = 0

    for (const order of expiredOrders) {
      try {
        // 开始事务
        const transaction = await db.startTransaction()

        try {
          // 1. 更新订单状态为已取消
          await transaction.collection('orders').doc(order._id).update({
            data: {
              status: 4, // 已取消
              updatedAt: new Date()
            }
          })

          // 2. 释放库存
          for (const item of order.items) {
            const productResult = await transaction.collection('products').doc(item.productId).get()
            
            if (productResult.data) {
              const product = productResult.data
              const quantity = Number(item.quantity) || 0
              const skuIndex = hasRealSkus(product)
                ? product.skus.findIndex(s => s.skuCode === item.skuCode)
                : -1

              if (skuIndex !== -1) {
                await transaction.collection('products').doc(item.productId).update({
                  data: {
                    [`skus.${skuIndex}.stock`]: _.inc(quantity)
                  }
                })
              } else {
                await transaction.collection('products').doc(item.productId).update({
                  data: {
                    stock: _.inc(quantity)
                  }
                })
              }
            }
          }

          // 3. 如果使用了优惠券，退还优惠券
          if (order.couponId) {
            await transaction.collection('user_coupons').doc(order.couponId).update({
              data: {
                status: 0, // 未使用
                usedAt: null,
                orderId: null
              }
            })
          }

          // 提交事务
          await transaction.commit()
          
          successCount++
          console.log(`订单 ${order.orderNo} 已自动取消`)

          // 发送订单取消通知（可选）
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.userId,
              page: `pages/order/detail/detail?orderId=${order._id}`,
              data: {
                thing1: { value: '订单已超时取消' },
                thing2: { value: order.orderNo },
                date3: { value: new Date().toLocaleString('zh-CN') }
              },
              templateId: 'YOUR_TEMPLATE_ID', // 需要在微信公众平台配置
              miniprogramState: 'formal'
            })
          } catch (msgError) {
            console.error('发送通知失败:', msgError)
            // 通知发送失败不影响订单取消
          }

        } catch (transactionError) {
          await transaction.rollback()
          throw transactionError
        }

      } catch (error) {
        failCount++
        console.error(`处理订单 ${order.orderNo} 失败:`, error)
      }
    }

    console.log(`处理完成：成功 ${successCount} 个，失败 ${failCount} 个`)

    return {
      success: true,
      message: `处理完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      data: {
        total: expiredOrders.length,
        success: successCount,
        fail: failCount
      }
    }

  } catch (error) {
    console.error('检查超时订单失败:', error)
    return {
      success: false,
      message: '检查超时订单失败',
      error: error.message
    }
  }
}
