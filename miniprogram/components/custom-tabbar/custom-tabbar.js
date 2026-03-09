Component({
  properties: {
    current: {
      type: Number,
      value: 0
    }
  },
  
  data: {
    currentTab: 0
  },
  
  lifetimes: {
    attached() {
      this.setData({
        currentTab: this.properties.current
      })
    }
  },
  
  methods: {
    switchTab(e) {
      const { index, url } = e.currentTarget.dataset
      const tabIndex = parseInt(index)
      
      // 如果点击的是当前页面，不做任何操作
      if (tabIndex === this.data.currentTab) {
        return
      }
      
      console.log('切换Tab:', { from: this.data.currentTab, to: tabIndex, url })
      
      this.setData({ currentTab: tabIndex })
      
      // 使用 reLaunch 来跳转，这样可以清空页面栈并跳转到新页面
      wx.reLaunch({ 
        url,
        success: () => {
          console.log('页面跳转成功:', url)
        },
        fail: (err) => {
          console.error('页面跳转失败:', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    }
  }
})
