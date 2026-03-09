// pages/trace/source/source.js
Page({
  data: {
    type: 'tea',
    productId: ''
  },

  onLoad(options) {
    const type = (options && options.type) || 'tea'
    const productId = (options && options.productId) || ''
    this.setData({ type, productId })
  }
})

