Component({
  properties: {
    current: {
      type: Number,
      value: 0
    }
  },

  data: {
    currentTab: 0,
    cartCount: 0,
    navigating: false
  },

  lifetimes: {
    attached() {
      this.setData({
        currentTab: this.properties.current
      })
      this.loadCartCount()
    }
  },

  pageLifetimes: {
    show() {
      this.loadCartCount()
    }
  },

  methods: {
    loadCartCount() {
      try {
        const cart = wx.getStorageSync('cart') || []
        const count = Array.isArray(cart)
          ? cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0
        this.setData({ cartCount: count })
      } catch (e) {
        // ignore
      }
    },

    switchTab(e) {
      const { index, url } = e.currentTarget.dataset
      const tabIndex = parseInt(index)

      if (!url || tabIndex === this.data.currentTab || this.data.navigating) {
        return
      }

      this.setData({
        currentTab: tabIndex,
        navigating: true
      })

      const resetNavigating = () => {
        this.setData({ navigating: false })
      }

      wx.redirectTo({
        url,
        success: () => {
          resetNavigating()
        },
        fail: (err) => {
          console.warn('redirectTo failed, trying reLaunch:', err)
          wx.reLaunch({
            url,
            success: () => {
              resetNavigating()
            },
            fail: (reLaunchErr) => {
              resetNavigating()
              console.error('Page navigation failed:', reLaunchErr)
              wx.showToast({ title: '跳转失败', icon: 'none' })
            }
          })
        }
      })
    }
  }
})
