// components/nav-header/nav-header.js
Component({
  options: {
    styleIsolation: 'shared',
    multipleSlots: true
  },
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: true
    }
  },
  data: {
    statusBarHeight: 20
  },
  lifetimes: {
    attached() {
      const info = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: info.statusBarHeight || 20
      })
    }
  },
  methods: {
    onBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.switchTab({ url: '/pages/index/index' })
      }
    }
  }
})
