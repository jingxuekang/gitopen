// 客服页面
Page({
  data: {
    messages: [],
    inputText: '',
    scrollToView: '',
    isOnline: false, // 客服是否在线
    userInfo: {
      avatar: '/images/default-avatar.png'
    },
    serviceAvatar: '/images/service-avatar.png',
    faqs: [
      { question: '如何查看物流信息？', answer: '您可以在订单详情页面点击"查看物流"按钮查看物流信息。' },
      { question: '如何申请退款？', answer: '如需退款，请在订单详情页面联系客服处理。' },
      { question: '商品多久发货？', answer: '一般情况下，我们会在24小时内为您发货。' },
      { question: '支持哪些支付方式？', answer: '目前支持微信支付。' },
      { question: '如何使用优惠券？', answer: '在订单确认页面可以选择可用的优惠券。' }
    ],
    messageId: 0
  },

  onLoad() {
    this.loadUserInfo()
    this.checkServiceStatus()
    this.addWelcomeMessage()
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.setData({ userInfo })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 检查客服状态
  checkServiceStatus() {
    // 这里可以调用云函数检查客服是否在线
    // 简化处理：默认离线
    this.setData({ isOnline: false })
  },

  // 添加欢迎消息
  addWelcomeMessage() {
    const welcomeMsg = {
      id: this.data.messageId++,
      type: 'service',
      contentType: 'text',
      content: this.data.isOnline ? '您好，有什么可以帮助您的吗？' : '客服暂时离线，请留言或查看常见问题。',
      time: new Date()
    }
    
    this.setData({
      messages: [welcomeMsg]
    })
  },

  // 输入消息
  onInput(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 发送文字消息
  onSendText() {
    const text = this.data.inputText.trim()
    if (!text) return

    const message = {
      id: this.data.messageId++,
      type: 'user',
      contentType: 'text',
      content: text,
      time: new Date()
    }

    this.setData({
      messages: [...this.data.messages, message],
      inputText: '',
      scrollToView: `msg-${message.id}`
    })

    // 模拟客服回复
    if (!this.data.isOnline) {
      setTimeout(() => {
        this.addServiceMessage('您的留言已收到，我们会尽快回复您。')
      }, 1000)
    }

    // 这里可以调用云函数发送消息到客服系统
    this.sendMessageToService(message)
  },

  // 选择图片
  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImage(res.tempFilePaths[0])
      }
    })
  },

  // 上传图片
  async uploadImage(filePath) {
    wx.showLoading({ title: '发送中...' })

    try {
      const cloudPath = `customer-service/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`
      const result = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      wx.hideLoading()

      const message = {
        id: this.data.messageId++,
        type: 'user',
        contentType: 'image',
        content: result.fileID,
        time: new Date()
      }

      this.setData({
        messages: [...this.data.messages, message],
        scrollToView: `msg-${message.id}`
      })

      // 发送到客服系统
      this.sendMessageToService(message)

    } catch (error) {
      wx.hideLoading()
      console.error('上传图片失败:', error)
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: [url]
    })
  },

  // 选择常见问题
  onSelectFaq(e) {
    const index = e.currentTarget.dataset.index
    const faq = this.data.faqs[index]

    // 添加用户消息
    const userMsg = {
      id: this.data.messageId++,
      type: 'user',
      contentType: 'text',
      content: faq.question,
      time: new Date()
    }

    // 添加客服回复
    const serviceMsg = {
      id: this.data.messageId++,
      type: 'service',
      contentType: 'text',
      content: faq.answer,
      time: new Date()
    }

    this.setData({
      messages: [...this.data.messages, userMsg, serviceMsg],
      scrollToView: `msg-${serviceMsg.id}`
    })
  },

  // 添加客服消息
  addServiceMessage(content) {
    const message = {
      id: this.data.messageId++,
      type: 'service',
      contentType: 'text',
      content: content,
      time: new Date()
    }

    this.setData({
      messages: [...this.data.messages, message],
      scrollToView: `msg-${message.id}`
    })
  },

  // 发送消息到客服系统
  async sendMessageToService(message) {
    // 这里可以调用云函数将消息发送到客服系统
    // 或者使用微信客服消息接口
    try {
      // 示例：调用云函数
      // await wx.cloud.callFunction({
      //   name: 'sendCustomerMessage',
      //   data: { message }
      // })
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }
})
