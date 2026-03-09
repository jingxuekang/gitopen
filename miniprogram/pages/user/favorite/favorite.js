// 收藏列表页面
Page({
  data: {
    favorites: [],
    loading: true
  },

  onShow() {
    this.loadFavorites()
  },

  // 加载收藏列表
  async loadFavorites() {
    try {
      this.setData({ loading: true })
      const db = wx.cloud.database()
      const result = await db.collection('favorites').orderBy('createdAt', 'desc').limit(50).get()

      this.setData({
        favorites: result.data || [],
        loading: false
      })
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      this.setData({ favorites: [], loading: false })
    }
  },

  // 取消收藏
  onRemoveFavorite(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('favorites').doc(id).remove()
            wx.showToast({ title: '已取消收藏', icon: 'success' })
            this.loadFavorites()
          } catch (error) {
            console.error('取消收藏失败:', error)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 查看商品详情
  onViewProduct(e) {
    const productId = e.currentTarget.dataset.productid
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    })
  },

  // 去逛逛
  onGoShopping() {
    wx.reLaunch({ url: '/pages/index/index' })
  }
})