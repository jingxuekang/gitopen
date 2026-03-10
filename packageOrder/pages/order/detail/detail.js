// 订单详情页面
const { formatBeijingTime, normalizeSpecText } = require('../../../../utils/util.js')

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    logistics: null,
    logisticsLoading: false
  },

  // 格式化价格
  formatPrice(price) {
    return (price / 100).toFixed(2)
  },

  // 格式化订单数据
  formatOrderData(order) {
    const items = Array.isArray(order.items) ? order.items : []
    const formatDisplayTime = (value) => {
      const text = formatBeijingTime(value)
      return text || ''
    }
    return {
      ...order,
      reviewed: order.reviewed === true || (items.length > 0 && items.every(item => item.reviewed === true)),
      createdAt: formatDisplayTime(order.createdAt),
      paymentTime: formatDisplayTime(order.paymentTime),
      deliveryTime: formatDisplayTime(order.deliveryTime),
      receiveTime: formatDisplayTime(order.receiveTime),
      totalAmountText: this.formatPrice(order.totalAmount),
      discountAmountText: this.formatPrice(order.discountAmount),
      payAmountText: this.formatPrice(order.payAmount),
      items: items.map(item => ({
        ...item,
        specText: normalizeSpecText(item.specText || ''),
        priceText: this.formatPrice(item.price)
      }))
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
    this.loadOrderDetail()
  },

  // 加载订单详情
  async loadOrderDetail() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: {
          orderId: this.data.orderId
        }
      })

      if (result.result.success) {
        const formattedOrder = this.formatOrderData(result.result.data)
        this.setData({
          order: formattedOrder,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载订单详情失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 复制订单号
  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.orderNo,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 查看物流
  async onViewLogistics() {
    if (this.data.logisticsLoading) return

    try {
      this.setData({ logisticsLoading: true })
      wx.showLoading({ title: '查询中...' })

      const result = await wx.cloud.callFunction({
        name: 'getLogistics',
        data: { orderId: this.data.orderId }
      })

      wx.hideLoading()
      this.setData({ logisticsLoading: false })

      if (result.result.success) {
        this.setData({ logistics: result.result.data })
      } else {
        wx.showToast({
          title: result.result.message || '查询失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      this.setData({ logisticsLoading: false })
      console.error('查询物流失败:', error)
      wx.showToast({
        title: '查询失败',
        icon: 'none'
      })
    }
  },

  // 取消订单
  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定要取消订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })

            const result = await wx.cloud.callFunction({
              name: 'cancelOrder',
              data: { orderId: this.data.orderId }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '订单已取消',
                icon: 'success'
              })
              this.loadOrderDetail()
            } else {
              wx.showToast({
                title: result.result.message || '取消失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('取消订单失败:', error)
            wx.showToast({
              title: '取消失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 去支付
  onPay() {
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${this.data.orderId}`
    })
  },

  // 确认收货
  onConfirmReceipt() {
    wx.showModal({
      title: '提示',
      content: '确认已收到货物吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '确认中...' })

            const result = await wx.cloud.callFunction({
              name: 'confirmReceipt',
              data: { orderId: this.data.orderId }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '确认收货成功',
                icon: 'success'
              })
              this.loadOrderDetail()
            } else {
              wx.showToast({
                title: result.result.message || '确认失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('确认收货失败:', error)
            wx.showToast({
              title: '确认失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 联系客服
  onContactService() {
    wx.navigateTo({
      url: `/pages/customer-service/customer-service?from=order&orderId=${this.data.orderId}`
    })
  },

  // 关闭物流弹窗
  onCloseLogistics() {
    this.setData({ logistics: null })
  },

  // 阻止事件冒泡
  onStopPropagation() {
    // 阻止冒泡
  },

  // 去评价
  onReview() {
    if (!this.data.order || !this.data.order.items || this.data.order.items.length === 0) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/review/review?orderId=${this.data.orderId}`
    })
  }
})
