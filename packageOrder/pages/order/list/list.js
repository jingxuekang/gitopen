// 订单列表页面
Page({
  data: {
    // Tab 列表
    tabs: [
      { key: 'all', name: '全部' },
      { key: 0, name: '待付款' },
      { key: 1, name: '待发货' },
      { key: 2, name: '待收货' },
      { key: 3, name: '已完成' }
    ],
    currentTab: 'all',
    
    // 订单列表
    orders: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    refreshing: false
  },

  // 格式化价格
  formatPrice(price) {
    return (price / 100).toFixed(2)
  },

  // 格式化订单数据
  formatOrders(orders) {
    return (Array.isArray(orders) ? orders : []).map(order => ({
      ...order,
      reviewed: order.reviewed === true || ((order.items || []).length > 0 && (order.items || []).every(item => item.reviewed === true)),
      payAmountText: this.formatPrice(order.payAmount),
      items: (order.items || []).map(item => ({
        ...item,
        priceText: this.formatPrice(item.price)
      }))
    }))
  },

  onLoad(options) {
    const status = options.status || 'all'
    this.setData({ currentTab: status })
    this.loadOrders(true)
  },

  // 切换 Tab
  onTabChange(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.currentTab) {
      return
    }

    this.setData({
      currentTab: status,
      orders: [],
      page: 1,
      hasMore: true
    })

    this.loadOrders(true)
  },

  // 加载订单列表
  async loadOrders(refresh = false) {
    if (this.data.loading) {
      return
    }

    if (!refresh && !this.data.hasMore) {
      return
    }

    this.setData({
      loading: true,
      refreshing: refresh
    })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getOrders',
        data: {
          status: this.data.currentTab,
          page: refresh ? 1 : this.data.page,
          pageSize: this.data.pageSize
        }
      })

      if (result.result.success) {
        const { orders, hasMore } = result.result.data
        const formattedOrders = this.formatOrders(orders)

        this.setData({
          orders: refresh ? formattedOrders : [...this.data.orders, ...formattedOrders],
          page: refresh ? 2 : this.data.page + 1,
          hasMore,
          loading: false,
          refreshing: false
        })
      } else {
        this.setData({
          loading: false,
          refreshing: false
        })
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载订单列表失败:', error)
      this.setData({
        loading: false,
        refreshing: false
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      orders: [],
      page: 1,
      hasMore: true
    })
    this.loadOrders(true)
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadOrders(false)
  },

  // 查看订单详情
  onViewOrder(e) {
    const orderId = this.getOrderIdFromEvent(e)
    if (!orderId) return
    wx.navigateTo({
      url: `/pages/order/detail/detail?orderId=${orderId}`
    })
  },

  // 去支付
  onPay(e) {
    const orderId = this.getOrderIdFromEvent(e)
    if (!orderId) return
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${orderId}`
    })
  },

  // 取消订单
  onCancel(e) {
    const orderId = this.getOrderIdFromEvent(e)
    if (!orderId) return

    wx.showModal({
      title: '提示',
      content: '确定要取消订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })

            const result = await wx.cloud.callFunction({
              name: 'cancelOrder',
              data: { orderId }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '订单已取消',
                icon: 'success'
              })
              this.loadOrders(true)
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

  // 确认收货
  onConfirmReceipt(e) {
    const orderId = this.getOrderIdFromEvent(e)
    if (!orderId) return

    wx.showModal({
      title: '提示',
      content: '确认已收到货物吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '确认中...' })

            const result = await wx.cloud.callFunction({
              name: 'confirmReceipt',
              data: { orderId }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '确认收货成功',
                icon: 'success'
              })
              this.loadOrders(true)
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

  // 去评价
  onReview(e) {
    const orderId = this.getOrderIdFromEvent(e)
    if (!orderId) return
    wx.navigateTo({
      url: `/pages/review/review?orderId=${orderId}`
    })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  // 再次购买
  onBuyAgain(e) {
    const orderId = this.getOrderIdFromEvent(e)
    if (!orderId) return
    const order = this.data.orders.find(o => o._id === orderId)

    if (order && order.items) {
      // 将订单商品添加到购物车
      wx.showLoading({ title: '加载中...' })
      
      Promise.all(
        order.items.map(item => 
          wx.cloud.callFunction({
            name: 'addToCart',
            data: {
              productId: item.productId,
              skuCode: item.skuCode,
              quantity: item.quantity
            }
          })
        )
      ).then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '已加入购物车',
          icon: 'success'
        })
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/cart/cart'
          })
        }, 1500)
      }).catch(error => {
        wx.hideLoading()
        console.error('添加到购物车失败:', error)
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      })
    }
  },

  // 获取订单状态文本
  getStatusText(status) {
    const statusMap = {
      0: '待付款',
      1: '待发货',
      2: '待收货',
      3: '已完成',
      4: '已取消'
    }
    return statusMap[status] || '未知'
  },

  getOrderIdFromEvent(e) {
    return (e && e.detail && (e.detail.orderId || (e.detail.order && e.detail.order._id))) ||
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) ||
      ''
  }
})
