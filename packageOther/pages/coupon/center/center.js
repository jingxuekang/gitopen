Page({
  data: {
    coupons: [],
    loading: true,
    claimingId: ''
  },

  onLoad() {
    this.loadCoupons()
  },

  onPullDownRefresh() {
    this.loadCoupons().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadCoupons() {
    if (this._loadingCoupons) return
    this._loadingCoupons = true
    this.setData({ loading: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getCoupons'
      })

      const payload = result && result.result ? result.result : {}
      if (payload.success) {
        this.setData({
          coupons: this.formatCoupons(payload.data),
          loading: false
        })
      } else {
        this.setData({
          coupons: [],
          loading: false
        })
        wx.showToast({
          title: payload.message || '暂无可领取优惠券',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载领券中心失败:', error)
      this.setData({
        coupons: [],
        loading: false
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this._loadingCoupons = false
    }
  },

  async onClaimCoupon(e) {
    const couponId = (e && e.detail && e.detail.couponId) ||
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) ||
      ''
    if (!couponId || this.data.claimingId) return

    this.setData({ claimingId: couponId })
    wx.showLoading({ title: '领取中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'claimCoupon',
        data: { couponId }
      })

      const payload = result && result.result ? result.result : {}
      if (payload.success) {
        wx.showToast({
          title: '领取成功',
          icon: 'success'
        })
        await this.loadCoupons()
      } else {
        wx.showToast({
          title: payload.message || '领取失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('领取优惠券失败:', error)
      wx.showToast({
        title: '领取失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ claimingId: '' })
    }
  },

  onBackMyCoupons() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }

    wx.navigateTo({
      url: '/pages/user/coupon/coupon'
    })
  },

  formatCoupons(list = []) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const rawValue = Number(item.value || 0)
      const amount = item.type === 1 ? rawValue / 100 : rawValue / 10
      const minAmount = Number(item.minAmount || 0)

      return {
        ...item,
        cardData: {
          _id: item._id,
          name: item.name || '优惠券',
          amount: Number.isFinite(amount) ? amount : 0,
          minAmount: Number.isFinite(minAmount) ? minAmount : 0,
          expireTime: item.validTo || ''
        }
      }
    })
  }
})
