// pages/user/settings/settings.js
Page({
  data: {
    settingsList: [
      { key: 'license', name: '营业执照' },
      { key: 'agreement', name: '用户协议' },
      { key: 'privacy', name: '隐私管理' }
    ],
    versionText: '当前版本：v1.0.0-微信'
  },

  onTapSetting(e) {
    const key = e.currentTarget.dataset.key
    const map = {
      license: '营业执照页面待接入',
      agreement: '用户协议页面待接入',
      privacy: '隐私管理页面待接入'
    }
    wx.showToast({
      title: map[key] || '功能开发中',
      icon: 'none'
    })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号？',
      success: (res) => {
        if (!res.confirm) return

        wx.removeStorageSync('token')
        wx.removeStorageSync('userId')
        wx.removeStorageSync('userInfo')

        wx.showToast({
          title: '已退出',
          icon: 'success'
        })

        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login?redirect=%2Fpages%2Fuser%2Fuser'
          })
        }, 280)
      }
    })
  }
})
