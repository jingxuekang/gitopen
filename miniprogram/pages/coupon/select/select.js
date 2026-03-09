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

      const result = await wx.cloud.callFunction({
        name: 'getAvailableCoupons',
        data: {
          totalAmount: this.data.totalAmount
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        // 格式化优惠券数据
        const coupons = result.result.data.map(coupon => ({
          ...coupon,
          formattedMinAmount: Math.floor(coupon.couponInfo.minAmount / 100),
          formattedValue: coupon.couponInfo.type === 1 
            ? (coupon.couponInfo.value / 100) 
            : (coupon.couponInfo.value / 10)
        }))
        
        this.setData({
          coupons: coupons,
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

  // 选择优惠券
  onSelectCoupon(e) {
    const couponId = e.currentTarget.dataset.id
    const available = e.currentTarget.dataset.available

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
  }
})
