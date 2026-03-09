// 客服页面
function buildSourceContext(options = {}) {
  const from = options.from || ''
  if (from === 'order') {
    const orderId = options.orderId || ''
    return orderId ? `订单咨询（${orderId.slice(-6)}）` : '订单咨询'
  }
  if (from === 'product') {
    const name = options.productName || ''
    return name ? `商品咨询（${name}）` : '商品咨询'
  }
  return '通用咨询'
}

Page({
  data: {
    messages: [],
    inputText: '',
    canSend: false,
    scrollToView: '',
    isOnline: false,
    sourceContext: '',
    userAvatarText: '我',
    userInfo: {
      avatar: ''
    },
    faqs: [
      { question: '如何查看物流信息？', answer: '您可以在订单详情页面点击“查看物流”查询物流信息。' },
      { question: '如何申请退款？', answer: '如需退款，请在订单详情页面联系在线客服处理。' },
      { question: '商品多久发货？', answer: '一般情况下，我们会在 24 小时内发货。' },
      { question: '支持哪些支付方式？', answer: '目前支持微信支付。' },
      { question: '如何使用优惠券？', answer: '在订单确认页面可选择可用优惠券。' }
    ],
    messageId: 0
  },

  onLoad(options = {}) {
    this.setData({
      sourceContext: buildSourceContext(options)
    })
    this.loadUserInfo()
    this.checkServiceStatus()
    this.addWelcomeMessage()
  },

  async loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const nickname = (userInfo.nickname || '').trim()
      this.setData({
        userInfo,
        userAvatarText: nickname ? nickname.slice(0, 1) : '我'
      })
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  checkServiceStatus() {
    this.setData({ isOnline: false })
  },

  addWelcomeMessage() {
    const context = this.data.sourceContext
    const content = this.data.isOnline
      ? `您好，这里是${context}，请问有什么可以帮您？`
      : `客服暂时离线，您可先留言。我们将尽快处理${context}相关问题。`

    const welcomeMsg = {
      id: this.data.messageId++,
      type: 'service',
      contentType: 'text',
      content,
      time: new Date()
    }

    this.setData({
      messages: [welcomeMsg]
    })
  },

  onInput(e) {
    const value = e.detail.value
    this.setData({
      inputText: value,
      canSend: value.trim().length > 0
    })
  },

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
      canSend: false,
      scrollToView: `msg-${message.id}`
    })

    if (!this.data.isOnline) {
      setTimeout(() => {
        this.addServiceMessage('留言已收到，我们会在工作时段尽快回复您。')
      }, 700)
    }

    this.sendMessageToService(message)
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.sendImage(tempFilePath)
      }
    })
  },

  sendImage(tempFilePath) {
    const message = {
      id: this.data.messageId++,
      type: 'user',
      contentType: 'image',
      content: tempFilePath,
      time: new Date()
    }

    this.setData({
      messages: [...this.data.messages, message],
      scrollToView: `msg-${message.id}`
    })

    this.uploadToCloud(tempFilePath, message.id)
    this.sendMessageToService(message)
  },

  async uploadToCloud(filePath, msgId) {
    try {
      const randomText = Math.random().toString(36).slice(2)
      const cloudPath = `customer-service/${Date.now()}-${randomText}.jpg`
      const result = await wx.cloud.uploadFile({ cloudPath, filePath })
      const msgs = this.data.messages.map(m =>
        m.id === msgId ? { ...m, content: result.fileID } : m
      )
      this.setData({ messages: msgs })
    } catch (err) {
      console.warn('云存储上传失败，使用本地路径:', err)
    }
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: [url]
    })
  },

  onSelectFaq(e) {
    const index = e.currentTarget.dataset.index
    const faq = this.data.faqs[index]
    if (!faq) return

    const userMsg = {
      id: this.data.messageId++,
      type: 'user',
      contentType: 'text',
      content: faq.question,
      time: new Date()
    }

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

  addServiceMessage(content) {
    const message = {
      id: this.data.messageId++,
      type: 'service',
      contentType: 'text',
      content,
      time: new Date()
    }

    this.setData({
      messages: [...this.data.messages, message],
      scrollToView: `msg-${message.id}`
    })
  },

  async sendMessageToService(_message) {
    try {
      // 这里可接入真实客服消息云函数
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }
})
