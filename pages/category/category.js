// pages/category/category.js
const { productApi } = require('../../utils/api.js')
const { formatPrice } = require('../../utils/util.js')

Page({
  data: {
    currentCategory: 'tea',
    products: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    error: false,
    
    // 茶叶筛选
    teaFilters: {
      type: { name: '品类', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: 'yinzhen', name: '银针' },
        { id: 'mudan', name: '牡丹' },
        { id: 'shoumei', name: '寿眉' },
        { id: 'gongmei', name: '贡眉' }
      ], selected: 'all' },
      age: { name: '年份', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: '1', name: '一年' },
        { id: '3', name: '三年' },
        { id: '5', name: '五年' },
        { id: '10', name: '十年' },
        { id: '15', name: '十五年' },
        { id: '15+', name: '十五年以上' }
      ], selected: 'all' },
      garden: { name: '茶园', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: 'garden', name: '普通茶园' },
        { id: 'base', name: '基地' },
        { id: 'wild', name: '荒野' }
      ], selected: 'all' }
    },
    
    // 陈皮筛选
    chenpiFilters: {
      origin: { name: '产区', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: 'yixian', name: '一线' },
        { id: 'meijian', name: '梅江' },
        { id: 'chajiao', name: '茶坑' }
      ], selected: 'all' },
      age: { name: '年份', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: '3', name: '三年' },
        { id: '5', name: '五年' },
        { id: '10', name: '十年' }
      ], selected: 'all' }
    },
    
    // 紫砂筛选
    teapotFilters: {
      shape: { name: '器型', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: 'ziyeshipiao', name: '子冶石瓢' },
        { id: 'dezhong', name: '德钟' }
      ], selected: 'all' },
      material: { name: '泥料', expanded: false, options: [
        { id: 'all', name: '全部' },
        { id: 'zini', name: '紫泥' },
        { id: 'duanni', name: '段泥' }
      ], selected: 'all' }
    }
  },

  onLoad(options) {
    const category = options.category || 'tea'
    this.setData({ currentCategory: category })
    this.loadProducts()
  },

  async loadProducts(append = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true, error: false })
    
    try {
      const filters = this.getCurrentFilters()
      const result = await productApi.getProducts({
        category: this.data.currentCategory,
        page: this.data.page,
        pageSize: this.data.pageSize,
        ...filters
      })
      
      console.log('[Category] getProducts result:', JSON.stringify(result))
      
      const products = append ? [...this.data.products, ...(result.list || result.products || [])] : (result.list || result.products || [])
      
      this.setData({
        products: products.map(p => ({
          ...p,
          priceText: formatPrice(p.price || 0)
        })),
        hasMore: result.hasMore || false,
        loading: false
      })
    } catch (err) {
      console.error('加载商品失败', err)
      this.setData({ loading: false, error: true })
    }
  },

  getCurrentFilters() {
    const filterKey = `${this.data.currentCategory}Filters`
    const filters = this.data[filterKey]
    const result = {}
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const selected = filters[key].selected
        if (selected && selected !== 'all') {
          result[key] = selected
        }
      })
    }
    
    return result
  },

  switchCategory(e) {
    const { category } = e.currentTarget.dataset
    if (category === this.data.currentCategory) return
    
    this.resetFilters(category)
    this.setData({
      currentCategory: category,
      products: [],
      page: 1,
      hasMore: true
    })
    this.loadProducts()
  },

  resetFilters(category) {
    const filterKey = `${category}Filters`
    const filters = this.data[filterKey]
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        filters[key].selected = 'all'
        filters[key].expanded = false
      })
      this.setData({ [filterKey]: filters })
    }
  },

  toggleFilter(e) {
    const { filter } = e.currentTarget.dataset
    const filterKey = `${this.data.currentCategory}Filters`
    const filters = this.data[filterKey]
    
    if (filters && filters[filter]) {
      filters[filter].expanded = !filters[filter].expanded
      this.setData({ [filterKey]: filters })
    }
  },

  selectFilter(e) {
    const { filter, option } = e.currentTarget.dataset
    const filterKey = `${this.data.currentCategory}Filters`
    const filters = this.data[filterKey]
    
    if (filters && filters[filter]) {
      filters[filter].selected = option
      this.setData({
        [filterKey]: filters,
        products: [],
        page: 1,
        hasMore: true
      })
      this.loadProducts()
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadProducts(true)
    }
  },

  goToProduct(e) {
    const id = (e && e.detail && (e.detail.productId || (e.detail.product && e.detail.product._id))) ||
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
    if (!id) return
    wx.navigateTo({
      url: `/packageProduct/pages/product/product?id=${id}`
    })
  },

  onRetry() {
    this.setData({ page: 1, products: [], hasMore: true })
    this.loadProducts()
  }
})
