// pages/login/login.js
Page({
  data: {
    loading: false,
    redirect: '/pages/user/user',
    agreed: false,
    phoneCode: '',
    showPhoneModal: false,
    phoneNumber: '',
    verifyCode: '',
    countdown: 0,
    sendingCode: false,
    phoneLogging: false,
    showWeChatAuthBtn: false
  },

  onLoad(options) {
    const redirect = options && options.redirect ? decodeURIComponent(options.redirect) : '/pages/user/user'
    this.setData({ redirect })
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/index/index' })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index',
      fail: () => {
        wx.redirectTo({
          url: '/pages/index/index'
        })
      }
    })
  },

  toggleAgree() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  onFeatureComingSoon() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  onWeChatLoginClick() {
    console.log('WeChat login button clicked');
    
    // 首先检查是否已同意用户协议
    if (!this.data.agreed) {
      wx.showModal({
        title: '提示',
        content: '请先阅读并同意《用户协议》和《隐私政策》',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#5B3A29'
      })
      return
    }
    
    // 直接进行微信快速登录，不强制要求手机号授权
    console.log('Proceeding with WeChat quick login');
    this.doLogin('')
  },

  showPhoneLogin() {
    console.log('showPhoneLogin called');
    this.setData({
      showPhoneModal: true
    })
  },

  hidePhoneLogin() {
    this.setData({
      showPhoneModal: false,
      phoneNumber: '',
      verifyCode: ''
    })
  },

  onPhoneInput(e) {
    this.setData({
      phoneNumber: e.detail.value
    })
  },

  onCodeInput(e) {
    this.setData({
      verifyCode: e.detail.value
    })
  },

  async sendVerifyCode() {
    const { phoneNumber, countdown } = this.data
    
    if (countdown > 0) return
    
    if (!phoneNumber) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      })
      return
    }
    
    this.setData({ sendingCode: true })
    
    try {
      // 模拟发送验证码
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 开始倒计时
      this.startCountdown()
      
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
      
      // 模拟验证码为123456
      console.log('模拟验证码: 123456')
    } catch (err) {
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ sendingCode: false })
    }
  },

  startCountdown() {
    let countdown = 60
    this.setData({ countdown })
    
    const timer = setInterval(() => {
      countdown--
      this.setData({ countdown })
      
      if (countdown <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  },

  async confirmPhoneLogin() {
    const { phoneNumber, verifyCode, agreed, phoneLogging } = this.data
    
    console.log('confirmPhoneLogin called', { phoneNumber, verifyCode, agreed, phoneLogging });
    
    if (phoneLogging) return
    
    if (!agreed) {
      wx.showModal({
        title: '提示',
        content: '请先阅读并同意《用户协议》和《隐私政策》',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#5B3A29'
      })
      return
    }
    
    if (!phoneNumber || !verifyCode) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }
    
    // 模拟验证码验证
    if (verifyCode !== '123456') {
      wx.showToast({
        title: '验证码错误',
        icon: 'none'
      })
      return
    }
    
    this.setData({ phoneLogging: true })
    wx.showLoading({ title: '登录中...' })
    
    try {
      console.log('Calling doPhoneLogin');
      await this.doPhoneLogin(phoneNumber)
    } catch (err) {
      console.error('手机号登录失败', err)
      wx.hideLoading()
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ phoneLogging: false })
    }
  },

  async doPhoneLogin(phoneNumber) {
    console.log('doPhoneLogin called with:', phoneNumber);
    // 手机号绑定：先确保微信登录（openid），再补充手机号到当前用户
    try {
      // 1. 先调用 login 确保有 openid 身份并同步 userId 到本地
      const loginRes = await wx.cloud.callFunction({ name: 'login', data: {} })
      const loginData = loginRes.result || {}
      if (loginData.code !== 0) {
        throw new Error(loginData.message || '请先完成微信登录')
      }
      const { userId, openid, userInfo: cloudUserInfo } = loginData.data || {}
      if (!userId) throw new Error('登录数据异常')
      wx.setStorageSync('userId', userId)
      wx.setStorageSync('openid', openid)
      wx.setStorageSync('userInfo', {
        _id: userId,
        nickname: cloudUserInfo?.nickname || '微信用户',
        avatar: cloudUserInfo?.avatar || '',
        memberLevel: cloudUserInfo?.memberLevel || 0,
        totalSpent: cloudUserInfo?.totalSpent || 0
      })

      // 2. 绑定手机号到当前用户
      const bindRes = await wx.cloud.callFunction({
        name: 'bindPhone',
        data: { phone: phoneNumber }
      })
      const bindData = bindRes.result || {}
      if (bindData.code !== 0) {
        throw new Error(bindData.message || '手机号绑定失败')
      }
      const userInfo = wx.getStorageSync('userInfo') || {}
      wx.setStorageSync('userInfo', { ...userInfo, phone: phoneNumber })
      wx.showToast({ title: '绑定成功', icon: 'success' })
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('cloud.callFunction:fail')) {
        throw new Error('手机号绑定需部署 bindPhone 云函数')
      }
      throw err
    }
    wx.hideLoading()
    this.hidePhoneLogin()
    setTimeout(() => this.afterLogin(), 220)
  },

  afterLogin() {
    // 登录后统一回到个人中心，避免 switchTab 在非原生 tabBar 场景失效
    wx.reLaunch({
      url: '/pages/user/user',
      fail: () => {
        wx.redirectTo({
          url: '/pages/user/user',
          fail: () => {
            wx.navigateTo({
              url: '/pages/user/user'
            })
          }
        })
      }
    })
  },

  async doLogin(phoneCode = '') {
    console.log('doLogin called', phoneCode);
    if (this.data.loading) return

    this.setData({ loading: true, phoneCode: phoneCode || '' })
    wx.showLoading({ title: '登录中...' })

    try {
      // 统一走云函数登录，以 openid 为身份，禁止前端直写 users
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: { phoneCode: phoneCode || '' }
      })

      const res = result.result || {}
      if (res.code !== 0) {
        throw new Error(res.message || '登录失败')
      }

      const { userId, openid, userInfo: cloudUserInfo } = res.data || {}
      if (!userId || !openid) {
        throw new Error('登录返回数据异常')
      }

      const userInfo = {
        _id: userId,
        nickname: cloudUserInfo?.nickname || '微信用户',
        avatar: cloudUserInfo?.avatar || '',
        memberLevel: cloudUserInfo?.memberLevel || 0,
        totalSpent: cloudUserInfo?.totalSpent || 0
      }

      wx.setStorageSync('token', res.data.token || `openid_${openid}`)
      wx.setStorageSync('userId', userId)
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('openid', openid)

      console.log('WeChat login data saved:', { userId, openid });

      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => this.afterLogin(), 220)
    } catch (err) {
      console.error('登录失败', err)
      wx.hideLoading()
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async onGetPhoneNumber(e) {
    console.log('onGetPhoneNumber called', e);
    const detail = e && e.detail ? e.detail : {}
    
    // 隐藏授权按钮
    this.setData({
      showWeChatAuthBtn: false
    })
    
    if (detail.errMsg !== 'getPhoneNumber:ok') {
      // 用户拒绝授权手机号或权限不足，直接进行微信登录
      console.log('Phone authorization failed, proceeding with WeChat login without phone');
      wx.showModal({
        title: '提示',
        content: '手机号授权失败，将使用微信快速登录',
        showCancel: false,
        confirmText: '确定',
        confirmColor: '#5B3A29',
        success: () => {
          // 直接进行微信登录，不传手机号code
          this.doLogin('')
        }
      })
      return
    }

    // 用户同意授权，获取手机号code并登录
    const phoneCode = detail.code || ''
    console.log('Phone authorization code:', phoneCode);
    await this.doLogin(phoneCode)
  },
})
