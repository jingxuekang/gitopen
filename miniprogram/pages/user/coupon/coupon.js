// 我的优惠券页面
Page({
  data: {
    tabs: ['未使用', '已使用', '已过期'],
    activeTab: 0,
    coupons: [],
    loading: true
  },

  onLoad() {
    this.loadCoupons()
  },

  onShow() {
    this.loadCoupons()
  },

  // 切换Tab
  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index,
      coupons: [],
      loading: true
    })
    this.loadCoupons()
  },

  // 加载优惠券
  async loadCoupons() {
    try {
      wx.showLoading({ title: '加载中...' })

      const result = await wx.cloud.callFunction({
        name: 'getUserCoupons',
        data: {
          status: this.data.activeTab
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        // 格式化优惠券数据
        const formattedCoupons = result.result.data.map(coupon => ({
          ...coupon,
          formattedMinAmount: Math.floor(coupon.couponInfo.minAmount / 100)
        }))
        
        this.setData({
          coupons: formattedCoupons,
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
      wx.hideLoading()
      console.error('加载优惠券失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCoupons()
    wx.stopPullDownRefresh()
  },

  // 去使用
  onUseCoupon() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 去领券中心
  onGoCouponCenter() {
    wx.navigateTo({
      url: '/pages/coupon/center/center'
    })
  }
})
