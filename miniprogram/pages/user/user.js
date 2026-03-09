// pages/user/user.js
const { userApi, orderApi } = require('../../utils/api.js')
const { formatPrice } = require('../../utils/util.js')

Page({
  data: {
    userInfo: null,
    isLogin: false,
    orderStats: {
      unpaid: 0,
      unshipped: 0,
      unreceived: 0,
      unreviewed: 0
    },
    memberLevels: ['普通会员', '银卡会员', '金卡会员'],
    memberThresholds: [0, 100000, 500000], // 单位：分
    memberBenefits: [
      ['正常价格购买', '积分累积'],
      ['9.5折优惠', '专属优惠券', '优先客服'],
      ['9折优惠', '专属优惠券', '优先客服', '生日礼包']
    ]
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    if (this.data.isLogin) {
      this.loadUserInfo()
      this.loadOrderStats()
    }
  },

  // 检查登录状态
  async checkLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.setData({ isLogin: true })
      await this.loadUserInfo()
      await this.loadOrderStats()
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userId = wx.getStorageSync('userId')
      if (!userId) return

      const db = wx.cloud.database()
      const result = await db.collection('users').doc(userId).get()

      if (result.data) {
        const userInfo = {
          _id: result.data._id,
          nickname: result.data.nickname || '微信用户',
          avatar: result.data.avatar || '',
          memberLevel: result.data.memberLevel || 0,
          totalSpent: result.data.totalSpent || 0
        }
        this.setData({ userInfo })
        wx.setStorageSync('userInfo', userInfo)
      }
    } catch (err) {
      console.error('加载用户信息失败', err)
    }
  },

  // 加载订单统计
  async loadOrderStats() {
    try {
      const orders = await orderApi.getOrders()
      const stats = {
        unpaid: 0,
        unshipped: 0,
        unreceived: 0,
        unreviewed: 0
      }

      orders.forEach(order => {
        if (order.status === 0) stats.unpaid++
        else if (order.status === 1) stats.unshipped++
        else if (order.status === 2) stats.unreceived++
        else if (order.status === 3 && !order.reviewed) stats.unreviewed++
      })

      this.setData({ orderStats: stats })
    } catch (err) {
      console.error('加载订单统计失败', err)
    }
  },

  // 用户登录
  async onLogin() {
    try {
      wx.showLoading({ title: '登录中...' })

      const db = wx.cloud.database()

      // 查询当前用户是否已存在
      const existResult = await db.collection('users').limit(1).get()

      let userInfo
      let userId

      if (existResult.data.length === 0) {
        // 新用户，创建记录
        const addResult = await db.collection('users').add({
          data: {
            nickname: '微信用户',
            avatar: '',
            phone: '',
            memberLevel: 0,
            totalSpent: 0,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
        userId = addResult._id
        userInfo = {
          _id: userId,
          nickname: '微信用户',
          avatar: '',
          memberLevel: 0,
          totalSpent: 0
        }
      } else {
        // 老用户
        const user = existResult.data[0]
        userId = user._id
        userInfo = {
          _id: userId,
          nickname: user.nickname || '微信用户',
          avatar: user.avatar || '',
          memberLevel: user.memberLevel || 0,
          totalSpent: user.totalSpent || 0
        }
        // 更新登录时间
        await db.collection('users').doc(userId).update({
          data: { updatedAt: db.serverDate() }
        }).catch(() => {})
      }

      // 保存登录信息
      const token = 'local_' + Date.now()
      wx.setStorageSync('token', token)
      wx.setStorageSync('userId', userId)
      wx.setStorageSync('userInfo', userInfo)

      this.setData({
        isLogin: true,
        userInfo: userInfo
      })

      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      this.loadOrderStats()
    } catch (err) {
      console.error('登录异常:', err)
      wx.hideLoading()
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    }
  },

  // 获取用户头像
  async onChooseAvatar(e) {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const { avatarUrl } = e.detail
    try {
      wx.showLoading({ title: '上传中...' })

      const cloudPath = `avatars/${wx.getStorageSync('userId')}-${Date.now()}.jpg`
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl
      })

      const userId = wx.getStorageSync('userId')
      const db = wx.cloud.database()
      await db.collection('users').doc(userId).update({
        data: { avatar: uploadResult.fileID, updatedAt: db.serverDate() }
      })

      const userInfo = this.data.userInfo
      userInfo.avatar = uploadResult.fileID
      this.setData({ userInfo })
      wx.setStorageSync('userInfo', userInfo)

      wx.hideLoading()
      wx.showToast({ title: '头像更新成功', icon: 'success' })
    } catch (err) {
      console.error('头像更新失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '头像更新失败', icon: 'none' })
    }
  },

  // 获取用户昵称
  async onNicknameChange(e) {
    const nickname = e.detail.value
    if (!nickname) return

    try {
      const userId = wx.getStorageSync('userId')
      const db = wx.cloud.database()
      await db.collection('users').doc(userId).update({
        data: { nickname, updatedAt: db.serverDate() }
      })

      const userInfo = this.data.userInfo
      userInfo.nickname = nickname
      this.setData({ userInfo })
      wx.setStorageSync('userInfo', userInfo)

      wx.showToast({ title: '昵称更新成功', icon: 'success' })
    } catch (err) {
      console.error('昵称更新失败:', err)
      wx.showToast({ title: '昵称更新失败', icon: 'none' })
    }
  },

  // 跳转到订单列表
  goToOrders(e) {
    const { status } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order/list/list?status=${status || ''}`
    })
  },

  // 跳转到地址管理
  goToAddress() {
    wx.navigateTo({
      url: '/pages/user/address/list/list'
    })
  },

  // 跳转到收藏列表
  goToFavorite() {
    wx.navigateTo({
      url: '/pages/user/favorite/favorite'
    })
  },

  // 跳转到优惠券
  goToCoupon() {
    wx.navigateTo({
      url: '/pages/user/coupon/coupon'
    })
  },

  // 联系客服
  goToCustomerService() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service'
    })
  },

  // 跳转到购物车
  goToCart() {
    wx.switchTab({
      url: '/pages/cart/cart'
    })
  },

  // 跳转到消息列表
  goToMessages() {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
    // TODO: 创建消息页面后取消注释
    // wx.navigateTo({
    //   url: '/pages/user/messages/messages'
    // })
  },

  // 充值
  goToRecharge() {
    wx.showToast({
      title: '充值功能开发中',
      icon: 'none'
    })
    // TODO: 实现充值功能
    // wx.navigateTo({
    //   url: '/pages/user/recharge/recharge'
    // })
  },

  // 提现
  goToWithdraw() {
    wx.showToast({
      title: '提现功能开发中',
      icon: 'none'
    })
    // TODO: 实现提现功能
    // wx.navigateTo({
    //   url: '/pages/user/withdraw/withdraw'
    // })
  },

  // 修改个人信息
  goToEdit() {
    wx.showToast({
      title: '请点击头像或昵称直接修改',
      icon: 'none'
    })
  },

  // 计算会员升级进度
  getMemberProgress() {
    if (!this.data.userInfo) return 0
    
    const { memberLevel, totalSpent } = this.data.userInfo
    const thresholds = this.data.memberThresholds
    
    if (memberLevel >= 2) return 100 // 已是最高等级
    
    const currentThreshold = thresholds[memberLevel]
    const nextThreshold = thresholds[memberLevel + 1]
    
    const progress = ((totalSpent - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    return Math.min(Math.max(progress, 0), 100)
  },

  // 格式化价格
  formatPrice(price) {
    return formatPrice(price)
  }
})
