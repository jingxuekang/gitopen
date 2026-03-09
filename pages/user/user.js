// pages/user/user.js
Page({
  data: {
    isLogin: false,
    userInfo: {},
    defaultAvatar: '',
    avatarText: '登',
    orderStats: {
      unpaid: 0,
      unshipped: 0,
      unreceived: 0,
      unreviewed: 0
    }
  },

  onShow() {
    this.loadUserInfo()
    this.loadOrderStats()
  },

  loadUserInfo() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo') || {}
    const isLogin = Boolean(token)
    const nickname = (userInfo.nickname || '').trim()
    const avatarText = isLogin ? (nickname ? nickname.slice(0, 1) : '微') : '登'

    this.setData({
      isLogin,
      userInfo: isLogin ? userInfo : {},
      avatarText
    })
  },

  async loadOrderStats() {
    if (!this.data.isLogin) {
      return
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'getOrders',
        data: {
          status: 'all',
          page: 1,
          pageSize: 50
        }
      })

      if (!result.result || !result.result.success) {
        return
      }

      const orders = (result.result.data && result.result.data.orders) || []
      const stats = {
        unpaid: 0,
        unshipped: 0,
        unreceived: 0,
        unreviewed: 0
      }

      orders.forEach((order) => {
        if (order.status === 0) stats.unpaid += 1
        if (order.status === 1) stats.unshipped += 1
        if (order.status === 2) stats.unreceived += 1
        if (order.status === 3) {
          const items = Array.isArray(order.items) ? order.items : []
          const hasPendingReview = items.some(item => item.reviewed !== true)
          if (hasPendingReview) stats.unreviewed += 1
        }
      })

      this.setData({ orderStats: stats })
    } catch (err) {
      console.warn('加载订单统计失败', err)
    }
  },

  onLoginTap() {
    console.log('onLoginTap called, isLogin:', this.data.isLogin);
    if (this.data.isLogin) {
      // 已登录用户点击，可以跳转到个人信息编辑页面
      wx.showToast({
        title: '个人信息开发中',
        icon: 'none'
      })
      return
    }
    
    // 未登录用户跳转到登录页面
    wx.navigateTo({
      url: '/pages/login/login?redirect=%2Fpages%2Fuser%2Fuser'
    })
  },

  onSettingsTap() {
    wx.navigateTo({
      url: '/packageUser/pages/user/settings/settings'
    })
  },

  goToOrders(e) {
    const status = e.currentTarget.dataset.status
    const suffix = status !== undefined ? `?status=${status}` : ''
    wx.navigateTo({
      url: `/packageOrder/pages/order/list/list${suffix}`
    })
  },

  goToAddress() {
    wx.navigateTo({
      url: '/packageUser/pages/user/address/list/list'
    })
  },

  goToFavorite() {
    wx.navigateTo({
      url: '/packageUser/pages/user/favorite/favorite'
    })
  },

  goToCoupon() {
    wx.navigateTo({
      url: '/packageUser/pages/user/coupon/coupon'
    })
  },

  goToCustomerService() {
    wx.navigateTo({
      url: '/packageOther/pages/customer-service/customer-service?from=user'
    })
  },

  goToMessages() {
    wx.showToast({
      title: '消息中心开发中',
      icon: 'none'
    })
  },

  onFeatureComingSoon() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})
