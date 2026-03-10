// 支付页面
const { normalizeSpecText } = require('../../../utils/util.js')

Page({
  data: {
    orderId: '',
    orderNo: '',
    payAmount: 0,
    payAmountText: '0.00',
    orderInfo: null,
    itemCount: 0,
    loading: true,
    paying: false
  },

  formatPrice(price) {
    return (Number(price || 0) / 100).toFixed(2)
  },

  normalizeOrderInfo(order = {}) {
    const items = Array.isArray(order.items) ? order.items : []
    const normalizedItems = items.map((item) => ({
      ...item,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Number(item.price) || 0,
      specText: normalizeSpecText(item.specText || ''),
      priceText: this.formatPrice(item.price)
    }))

    const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = Number(order.totalAmount) || 0
    const memberDiscount = Number(order.memberDiscount) || 0
    const discountAmount = Number(order.discountAmount) || 0
    const fallbackPayAmount = Math.max(totalAmount - memberDiscount - discountAmount, 0)
    const payAmount = Number.isFinite(Number(order.payAmount))
      ? Number(order.payAmount)
      : fallbackPayAmount

    return {
      orderInfo: {
        ...order,
        items: normalizedItems
      },
      itemCount,
      payAmount,
      payAmountText: this.formatPrice(payAmount)
    }
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
        const normalized = this.normalizeOrderInfo(order)
        this.setData({
          ...normalized,
          orderNo: order.orderNo || '',
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
        if (paymentData && paymentData.mockPaid) {
          this.onPaymentSuccess()
          return
        }

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
