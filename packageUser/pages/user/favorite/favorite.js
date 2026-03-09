const { favoriteApi, cartApi, productApi } = require('../../../utils/api.js')
const { formatPrice } = require('../../../utils/util.js')

const DEFAULT_PRODUCT_IMAGE = '/images/empty/product.png'

function normalizeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildFallbackSpecValues(product = {}) {
  const values = []
  const addSpec = (label, value) => {
    if (value === undefined || value === null) return
    const text = String(value).trim()
    if (!text) return
    values.push(`${label}:${text}`)
  }

  if (product.category === 'teapot') {
    addSpec('壶型', product.subCategory)
    addSpec('泥料', product.material)
    addSpec('工艺', product.craftType || product.craft)
    addSpec('容量', product.capacity)
  } else if (product.category === 'chenpi') {
    addSpec('产区', product.subCategory || product.origin)
    addSpec('年份', product.year)
    addSpec('净含量', product.weight)
  } else {
    addSpec('品类', product.subCategory)
    addSpec('年份', product.year)
    addSpec('净含量', product.weight)
  }

  if (values.length === 0) {
    values.push('默认规格:标准')
  }
  return [...new Set(values)]
}

function normalizeSkus(product = {}, sourceSkus = []) {
  const basePrice = normalizeNumber(product.price, 0)
  const baseStock = Math.max(0, normalizeNumber(product.stock, 0))
  const defaultSkuCode = `DEFAULT_${product._id || 'SKU'}`
  const list = Array.isArray(sourceSkus) ? sourceSkus : []

  if (!list.length) {
    return [{
      skuCode: defaultSkuCode,
      specValues: buildFallbackSpecValues(product),
      price: basePrice,
      stock: baseStock
    }]
  }

  return list.map((sku, index) => ({
    ...sku,
    skuCode: sku && sku.skuCode ? sku.skuCode : `${defaultSkuCode}_${index}`,
    specValues: Array.isArray(sku && sku.specValues) && sku.specValues.length > 0
      ? sku.specValues
      : ['默认规格:标准'],
    price: normalizeNumber(sku && sku.price, basePrice),
    stock: Math.max(0, normalizeNumber(sku && sku.stock, baseStock))
  }))
}

function normalizeProductInfo(product = {}) {
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image || DEFAULT_PRODUCT_IMAGE]
  const price = normalizeNumber(product.price, 0)
  const skus = normalizeSkus(product, product.skus)

  return {
    ...product,
    _id: product._id || '',
    name: product.name || '商品',
    description: product.description || '',
    images,
    sales: normalizeNumber(product.sales, 0),
    price,
    priceText: formatPrice(price),
    skus
  }
}

function normalizeFavoriteItem(item = {}) {
  const rawProduct = item.product || item.productInfo || {}
  const productInfo = normalizeProductInfo(rawProduct)
  const productId = item.productId || productInfo._id || ''

  if (!productId) {
    return null
  }

  return {
    _id: item._id || productId,
    productId,
    createdAt: item.createdAt || 0,
    productInfo
  }
}

function pickAvailableSku(productInfo = {}) {
  const skus = Array.isArray(productInfo.skus) ? productInfo.skus : []
  if (!skus.length) return null
  return skus.find((sku) => (sku.stock || 0) > 0) || skus[0]
}

Page({
  data: {
    favorites: [],
    loading: true,
    page: 1,
    pageSize: 20,
    hasMore: false,
    cartSubmitting: false
  },

  onLoad() {
    this.refreshFavorites()
  },

  onShow() {
    this.refreshFavorites()
  },

  onPullDownRefresh() {
    this.refreshFavorites().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {},

  async refreshFavorites() {
    this.setData({ loading: true })
    try {
      const list = await favoriteApi.getFavorites()
      const favorites = (Array.isArray(list) ? list : [])
        .map(normalizeFavoriteItem)
        .filter(Boolean)

      this.setData({
        favorites,
        loading: false,
        hasMore: false,
        page: 1
      })
    } catch (err) {
      console.error('加载收藏列表失败:', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  getFavoriteByProductId(productId) {
    return (this.data.favorites || []).find((item) => item.productId === productId) || null
  },

  async onRemoveFavorite(e) {
    const productId = e.currentTarget.dataset.id
    if (!productId) return

    const modalRes = await new Promise((resolve) => {
      wx.showModal({
        title: '提示',
        content: '确定要取消收藏吗？',
        success: resolve,
        fail: () => resolve({ confirm: false })
      })
    })

    if (!modalRes.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })
      await favoriteApi.removeFavorite(productId)
      wx.hideLoading()

      this.setData({
        favorites: this.data.favorites.filter((item) => item.productId !== productId)
      })
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })
    } catch (err) {
      wx.hideLoading()
      console.error('取消收藏失败:', err)
      wx.showToast({
        title: err && err.message ? err.message : '取消失败',
        icon: 'none'
      })
    }
  },

  async ensureFreshProductInfo(productId, productInfo) {
    const current = productInfo || {}
    const skus = Array.isArray(current.skus) ? current.skus : []
    const hasValidSkuCode = skus.some((sku) => sku && sku.skuCode)

    if (hasValidSkuCode) {
      return current
    }

    try {
      const detail = await productApi.getProductDetail(productId)
      const product = detail && detail.product ? detail.product : detail
      const normalized = normalizeProductInfo(product || {})

      if (normalized && normalized._id) {
        this.setData({
          favorites: (this.data.favorites || []).map((item) => {
            if (item.productId !== productId) return item
            return {
              ...item,
              productInfo: normalized
            }
          })
        })
      }
      return normalized
    } catch (err) {
      console.warn('刷新商品规格失败，使用当前数据', err)
      return current
    }
  },

  async syncCartCount() {
    try {
      const cartData = await cartApi.getCart()
      const items = cartData && Array.isArray(cartData.items) ? cartData.items : []
      const cartCount = items.reduce((sum, item) => sum + normalizeNumber(item.quantity, 0), 0)
      wx.setStorageSync('cartCount', cartCount)
    } catch (err) {
      console.warn('同步购物车数量失败', err)
    }
  },

  async onAddToCart(e) {
    const productId = (e && e.detail && (e.detail.productId || (e.detail.product && e.detail.product._id))) ||
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
    if (!productId || this.data.cartSubmitting) return

    const favoriteItem = this.getFavoriteByProductId(productId)
    if (!favoriteItem || !favoriteItem.productInfo) {
      wx.showToast({
        title: '商品信息缺失',
        icon: 'none'
      })
      return
    }

    this.setData({ cartSubmitting: true })
    try {
      const productInfo = await this.ensureFreshProductInfo(productId, favoriteItem.productInfo)
      const sku = pickAvailableSku(productInfo)

      if (!sku || !sku.skuCode) {
        wx.showToast({
          title: '该商品暂无可选规格',
          icon: 'none'
        })
        return
      }

      if ((sku.stock || 0) <= 0) {
        wx.showToast({
          title: '该商品已售罄',
          icon: 'none'
        })
        return
      }

      await cartApi.addToCart({
        productId,
        skuCode: sku.skuCode,
        quantity: 1,
        productName: productInfo.name,
        productImage: (Array.isArray(productInfo.images) && productInfo.images[0]) || productInfo.image || DEFAULT_PRODUCT_IMAGE,
        price: normalizeNumber(sku.price, normalizeNumber(productInfo.price, 0)),
        specText: Array.isArray(sku.specValues) ? sku.specValues.join(' ') : '',
        stock: normalizeNumber(sku.stock, normalizeNumber(productInfo.stock, 0))
      })

      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      })
      this.syncCartCount()
    } catch (err) {
      console.error('加入购物车失败:', err)
      wx.showToast({
        title: err && err.message ? err.message : '加入失败',
        icon: 'none'
      })
    } finally {
      this.setData({ cartSubmitting: false })
    }
  },

  onGoShopping() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  onViewProduct(e) {
    const productId = (e && e.detail && (e.detail.productId || (e.detail.product && e.detail.product._id))) ||
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
    if (!productId) return
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    })
  }
})
