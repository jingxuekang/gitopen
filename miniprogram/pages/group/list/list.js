// 拼团列表页面
Page({
  data: {
    activities: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.loadActivities()
  },

  // 加载拼团活动
  async loadActivities() {
    if (!this.data.hasMore) return

    try {
      wx.showLoading({ title: '加载中...' })

      const result = await wx.cloud.callFunction({
        name: 'getGroupActivities',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        this.setData({
          activities: [...this.data.activities, ...result.result.data.activities],
          hasMore: result.result.data.hasMore,
          page: this.data.page + 1,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载拼团活动失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      activities: [],
      page: 1,
      hasMore: true
    })
    this.loadActivities()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadActivities()
  },

  // 查看拼团详情
  onViewActivity(e) {
    const activityId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/group/detail/detail?activityId=${activityId}`
    })
  },

  // 查看商品详情
  onViewProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    })
  }
})
