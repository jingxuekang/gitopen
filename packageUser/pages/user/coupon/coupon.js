// 我的优惠券页面
Page({
  data: {
    tabs: ['未使用', '已使用', '已过期'],
    activeTab: 0,
    coupons: [],
    loading: true
  },

  shouldSilentEmpty(payload = {}) {
    const text = [
      payload && payload.message,
      payload && payload.error
    ].filter(Boolean).join(' | ')

    return text.includes('获取用户优惠券失败') ||
      text.includes('DATABASE_COLLECTION_NOT_EXIST') ||
      text.includes('collection not exists') ||
      text.includes('Db or Table not exist') ||
      text.includes('user_coupons')
  },

  onLoad() {},

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
    if (this._loadingCoupons) return

    this._loadingCoupons = true
    this.setData({ loading: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getUserCoupons',
        data: {
          status: this.data.activeTab
        }
      })

      const payload = result && result.result ? result.result : {}
      if (payload.success === true) {
        this.setData({
          coupons: this.formatCoupons(payload.data),
          loading: false
        })
      } else {
        // 数据表未初始化或空数据时，统一静默展示空态，避免反复弹错
        this.setData({
          coupons: [],
          loading: false
        })

        if (!this.shouldSilentEmpty(payload)) {
          wx.showToast({
            title: payload.message || '加载失败',
            icon: 'none'
          })
        }
      }
    } catch (error) {
      console.error('加载优惠券失败:', error)
      this.setData({
        coupons: [],
        loading: false
      })
    } finally {
      this._loadingCoupons = false
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCoupons()
    wx.stopPullDownRefresh()
  },

  // 去使用
  onUseCoupon(e) {
    const couponId = e && e.detail && e.detail.couponId
    if (couponId) {
      wx.setStorageSync('selectedCouponId', couponId)
    }
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 去领券中心
  onGoCouponCenter() {
    wx.navigateTo({
      url: '/pages/coupon/center/center'
    })
  },

  formatCoupons(list = []) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const info = item && item.couponInfo ? item.couponInfo : {}
      const rawValue = Number(info.value || 0)
      const amount = info.type === 1 ? rawValue / 100 : rawValue / 10
      const minAmount = Number(info.minAmount || info.minAmountText || 0)

      return {
        ...item,
        cardData: {
          name: info.name || '优惠券',
          amount: Number.isFinite(amount) ? amount : 0,
          minAmount: Number.isFinite(minAmount) ? minAmount : 0,
          expireTime: info.validTo || info.expireTime || ''
        }
      }
    })
  }
})
