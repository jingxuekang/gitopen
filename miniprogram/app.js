// app.js
const { handleError } = require('./utils/errorHandler.js')

App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-0gswdm2a347e7be7',
        traceUser: true,
      })
    }

    // 获取用户信息
    this.globalData = {
      userInfo: null,
      token: null
    }

    // 设置全局错误监听
    this.setupErrorHandlers()
  },

  /**
   * 设置全局错误处理器
   */
  setupErrorHandlers() {
    // 监听小程序错误
    wx.onError((error) => {
      console.error('[全局错误]', error)
      handleError({
        code: 500,
        message: '程序运行异常',
        stack: error
      }, {
        showMessage: false,
        context: { type: 'runtime' }
      })
    })

    // 监听未处理的Promise拒绝
    wx.onUnhandledRejection((res) => {
      console.error('[未处理的Promise拒绝]', res)
      handleError({
        code: 500,
        message: '异步操作失败',
        stack: res.reason
      }, {
        showMessage: false,
        context: { type: 'promise', reason: res.reason }
      })
    })
  },

  /**
   * 全局错误处理方法
   */
  handleError(error, options) {
    return handleError(error, options)
  }
})
