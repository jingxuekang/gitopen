// 评价列表页
Page({
  data: {
    productId: '',
    reviews: [],
    total: 0,
    loading: true,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad(options) {
    const productId = (options && options.productId) || ''
    this.setData({ productId })
    if (productId) {
      this.loadReviews()
    } else {
      this.setData({ loading: false })
    }
  },

  async loadReviews() {
    if (!this.data.productId) return
    if (!this.data.hasMore && this.data.page > 1) return

    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getReviews',
        data: {
          productId: this.data.productId,
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      })
      const result = res.result || {}
      const data = result.success ? (result.data || {}) : {}
      const reviews = data.reviews || []
      const total = data.total || 0
      const hasMore = data.hasMore !== false && reviews.length >= this.data.pageSize

      this.setData({
        reviews: this.data.page === 1 ? reviews : [...this.data.reviews, ...reviews],
        total,
        hasMore,
        page: this.data.page + 1,
        loading: false
      })
    } catch (e) {
      console.error('加载评价失败', e)
      this.setData({
        loading: false,
        hasMore: false
      })
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadReviews()
    }
  }
})
