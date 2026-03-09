const { couponApi } = require('../../../utils/api.js')

// 优惠券选择页面
Page({
  data: {
    coupons: [],
    loading: true,
    selectedCouponId: '',
    totalAmount: 0
  },

  onLoad(options) {
    const { totalAmount, selectedCouponId } = options
    
    this.setData({
      totalAmount: parseInt(totalAmount) || 0,
      selectedCouponId: selectedCouponId || ''
    })

    this.loadCoupons()
  },

  // 加载可用优惠券
  async loadCoupons() {
    try {
      wx.showLoading({ title: '加载中...' })

      const coupons = await couponApi.getAvailableCoupons(this.data.totalAmount)
      this.setData({
        coupons: this.formatCoupons(coupons),
        loading: false
      })
    } catch (error) {
      console.error('加载优惠券失败:', error)
      // 读取失败时按“暂无可用优惠券”处理，避免阻断用户下单
      this.setData({
        coupons: [],
        loading: false
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 选择优惠券
  onSelectCoupon(e) {
    const couponId = (e && e.detail && e.detail.couponId) ||
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) ||
      ''
    const availableFromDetail = e && e.detail && e.detail.coupon && e.detail.coupon.available
    const availableFromDataset = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.available
    const available = availableFromDetail !== undefined ? availableFromDetail : availableFromDataset

    // 如果是不可用的优惠券，不允许选择
    if (couponId && available === false) {
      return
    }

    this.setData({
      selectedCouponId: couponId
    })
  },

  // 确认选择
  onConfirm() {
    const selectedCoupon = this.data.coupons.find(c => c._id === this.data.selectedCouponId)
    
    // 获取上一页
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    
    if (prevPage) {
      // 将选中的优惠券信息传回上一页
      prevPage.setData({
        selectedCoupon: selectedCoupon || null,
        selectedCouponId: this.data.selectedCouponId
      })
      
      // 触发上一页的优惠券更新方法
      if (prevPage.onCouponSelected) {
        prevPage.onCouponSelected(selectedCoupon)
      }
    }

    wx.navigateBack()
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
