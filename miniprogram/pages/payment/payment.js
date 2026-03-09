// 支付页面
Page({
  data: {
    orderId: '',
    orderNo: '',
    payAmount: 0,
    orderInfo: null,
    loading: true,
    paying: false
  },

  onLoad(options) {
    const orderId = options.orderId
    if (!orderId) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.setData({ orderId })
    this.loadOrderInfo()
  },

  // 加载订单信息
  async loadOrderInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: {
          orderId: this.data.orderId
        }
      })

      if (result.result.success) {
        const order = result.result.data
        
        // 格式化订单数据
        const formattedOrder = {
          ...order,
          formattedPayAmount: (order.payAmount / 100).toFixed(2),
          items: order.items.map(item => ({
            ...item,
            formattedPrice: (item.price / 100).toFixed(2)
          }))
        }
        
        this.setData({
          orderInfo: formattedOrder,
          orderNo: order.orderNo,
          payAmount: order.payAmount,
          loading: false
        })
      } else {
        wx.showToast({
          title: result.result.message || '加载订单失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载订单信息失败:', error)
      wx.showToast({
        title: '加载订单失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 发起支付
  async onPay() {
    if (this.data.paying) {
      return
    }

    this.setData({ paying: true })

    try {
      // 调用创建支付云函数
      const result = await wx.cloud.callFunction({
        name: 'createPayment',
        data: {
          orderId: this.data.orderId
        }
      })

      if (result.result.success) {
        const paymentData = result.result.data

        // 调起微信支付
        wx.requestPayment({
          timeStamp: paymentData.timeStamp,
          nonceStr: paymentData.nonceStr,
          package: paymentData.package,
          signType: paymentData.signType,
          paySign: paymentData.paySign,
          success: (res) => {
            // 支付成功
            this.onPaymentSuccess()
          },
          fail: (err) => {
            // 支付失败或取消
            this.setData({ paying: false })
            
            if (err.errMsg === 'requestPayment:fail cancel') {
              wx.showToast({
                title: '支付已取消',
                icon: 'none'
              })
            } else {
              wx.showToast({
                title: '支付失败',
                icon: 'none'
              })
            }
          }
        })
      } else {
        this.setData({ paying: false })
        wx.showToast({
          title: result.result.message || '创建支付失败',
          icon: 'none'
        })
      }
    } catch (error) {
      this.setData({ paying: false })
      console.error('发起支付失败:', error)
      wx.showToast({
        title: '发起支付失败',
        icon: 'none'
      })
    }
  },

  // 支付成功处理
  onPaymentSuccess() {
    wx.showToast({
      title: '支付成功',
      icon: 'success',
      duration: 2000
    })

    // 延迟跳转到订单详情页
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/order/detail/detail?orderId=${this.data.orderId}`
      })
    }, 2000)
  },

  // 查询支付状态
  async checkPaymentStatus() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: {
          orderId: this.data.orderId
        }
      })

      if (result.result.success) {
        const order = result.result.data
        if (order.paymentStatus === 1) {
          // 已支付
          this.onPaymentSuccess()
        } else {
          wx.showToast({
            title: '订单未支付',
            icon: 'none'
          })
        }
      }
    } catch (error) {
      console.error('查询支付状态失败:', error)
    }
  },

  // 取消支付，返回订单列表
  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定要取消支付吗？订单将保留，您可以稍后继续支付',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({
            url: '/pages/order/list/list'
          })
        }
      }
    })
  }
})
