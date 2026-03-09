// pages/search/search.js
const { productApi } = require('../../utils/api.js')
const { formatPrice, getStorage, setStorage } = require('../../utils/util.js')

Page({
  data: {
    keyword: '',
    searchHistory: [],
    searchResults: [],
    hotKeywords: ['普洱茶', '陈皮', '紫砂壶', '绿茶', '红茶'],
    searching: false,
    searched: false
  },

  onLoad() {
    this.loadSearchHistory()
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = getStorage('searchHistory') || []
    this.setData({ searchHistory: history })
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    let history = this.data.searchHistory
    
    // 移除重复项
    history = history.filter(item => item !== keyword)
    
    // 添加到开头
    history.unshift(keyword)
    
    // 限制最多10条
    if (history.length > 10) {
      history = history.slice(0, 10)
    }
    
    setStorage('searchHistory', history)
    this.setData({ searchHistory: history })
  },

  // 清空搜索历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          setStorage('searchHistory', [])
          this.setData({ searchHistory: [] })
        }
      }
    })
  },

  // 输入关键词
  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 点击搜索
  onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }
    
    this.performSearch(keyword)
  },

  // 点击热门关键词或历史记录
  onKeywordTap(e) {
    const { keyword } = e.currentTarget.dataset
    this.setData({ keyword })
    this.performSearch(keyword)
  },

  // 执行搜索
  async performSearch(keyword) {
    if (this.data.searching) return
    
    this.setData({ searching: true, searched: false })
    
    try {
      const results = await productApi.searchProducts(keyword)
      
      this.setData({
        searchResults: results,
        searched: true
      })
      
      // 保存搜索历史
      this.saveSearchHistory(keyword)
      
      // 如果没有结果，显示提示
      if (results.length === 0) {
        wx.showToast({
          title: '未找到相关商品',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      })
    } finally {
      this.setData({ searching: false })
    }
  },

  // 跳转到商品详情
  goToProduct(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/product/product?id=${id}`
    })
  },

  // 格式化价格
  formatPrice(price) {
    return formatPrice(price)
  }
})
