// pages/product/product.js
const { productApi, cartApi, favoriteApi } = require('../../utils/api.js')
const {
  formatPrice,
  calculateMemberPrice,
  getMemberDiscount,
  checkStockStatus,
  getStockStatusText,
  getStorage
} = require('../../utils/util.js')

const CATEGORY_IMAGE_MAP = {
  tea: '/images/category/tea.png',
  chenpi: '/images/category/chenpi.png',
  teapot: '/images/category/teapot.png'
}

const SUB_CATEGORY_MAP = {
  '银针': 'yinzhen',
  '牡丹': 'mudan',
  '寿眉': 'shoumei',
  '贡眉': 'gongmei'
}

const SUB_CATEGORY_LABEL_MAP = {
  yinzhen: '银针',
  mudan: '牡丹',
  shoumei: '寿眉',
  gongmei: '贡眉'
}

function normalizePriceFen(input) {
  const value = Number(input)
  return Number.isFinite(value) ? value : 0
}

Page({
  data: {
    productId: '',
    product: null,
    reviews: [],
    currentImageIndex: 0,
    selectedSku: null,
    showSpecSelector: false,
    showShareSheet: false,
    selectedSkuLabel: '',
    isFavorite: false,
    loading: true,
    memberLevel: 0,
    stockStatus: {
      inStock: false,
      stock: 0,
      status: 'out_of_stock'
    },
    cartCount: 0,
    teaCategoryAssets: {
      subCategoryIcons: {},
      gardenTypeIcons: {}
    },
    detailMeta: [],
    detailDescription: '',
    detailWeight: '',
    detailPerJinPrice: '0.00',
    detailImages: [],
    displayPrice: '0.00',
    displayOriginalPrice: '0.00',
    stockStatusText: '',
    sharePath: '',
    shareTitle: '',
    templateConfig: {
      subCategory: {
        yinzhen: '/images/category/tea.png',
        mudan: '/images/category/tea.png',
        shoumei: '/images/category/tea.png',
        gongmei: '/images/category/tea.png'
      },
      gardenType: {
        garden: '/images/category/tea.png',
        base: '/images/category/tea.png',
        wild: '/images/category/tea.png'
      }
    }
  },

  onLoad(options) {
    if (!options || !options.id) {
      wx.showToast({ title: '商品参数缺失', icon: 'none' })
      this.setData({ loading: false })
      return
    }

    this.setData({ productId: options.id })
    this.loadTeaCategoryAssets()
    this.loadUserProfile()
    this.loadCartCount()
    this.loadProductDetail()
    this.checkFavoriteStatus()
  },

  onShow() {
    this.loadUserProfile()
    this.loadCartCount()
    this.checkFavoriteStatus()
  },

  async loadUserProfile() {
    try {
      const result = await wx.cloud.callFunction({ name: 'getUserProfile' })
      if (result && result.result && result.result.success) {
        this.setData({
          memberLevel: result.result.data.memberLevel || 0
        })
      }
    } catch (err) {
      console.error('加载用户信息失败', err)
    }
  },

  async loadCartCount() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getCart'
      })
      const items = result && result.result && result.result.code === 0 && result.result.data
        ? (result.result.data.items || [])
        : []
      const cartCount = Array.isArray(items)
        ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0
      this.setData({ cartCount })
    } catch (err) {
      console.warn('加载购物车数量失败，使用本地缓存', err)
      const cart = getStorage('cart') || []
      const cartCount = Array.isArray(cart)
        ? cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0
      this.setData({ cartCount })
    }
  },

  normalizeProduct(product) {
    if (!product) return null

    const normalizedSubCategory = SUB_CATEGORY_MAP[product.subCategory] || product.subCategory
    const skus = Array.isArray(product.skus)
      ? product.skus.map((item) => ({
        ...item,
        priceText: formatPrice(normalizePriceFen(item.price)),
        specLabel: Array.isArray(item.specValues) ? item.specValues.join(' ') : ''
      }))
      : []
    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image || CATEGORY_IMAGE_MAP[product.category] || CATEGORY_IMAGE_MAP.tea]

    return {
      ...product,
      price: normalizePriceFen(product.price),
      originalPrice: normalizePriceFen(product.originalPrice || product.price),
      skus,
      subCategory: normalizedSubCategory || 'yinzhen',
      gardenType: product.gardenType || 'garden',
      origin: product.origin || '福建福鼎',
      year: product.year || '当年',
      images
    }
  },

  async resolveCloudMap(map = {}) {
    const input = map && typeof map === 'object' ? map : {}
    const entries = Object.entries(input)
    const cloudFileList = entries
      .map(([, value]) => value)
      .filter((value) => typeof value === 'string' && value.indexOf('cloud://') === 0)

    if (!cloudFileList.length) {
      return input
    }

    try {
      const res = await wx.cloud.getTempFileURL({ fileList: cloudFileList })
      const urlMap = {}
      ;(res.fileList || []).forEach((item) => {
        if (item.fileID && item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL
        }
      })

      const output = {}
      entries.forEach(([key, value]) => {
        if (typeof value === 'string' && value.indexOf('cloud://') === 0) {
          output[key] = urlMap[value] || value
        } else {
          output[key] = value
        }
      })
      return output
    } catch (err) {
      console.error('解析茶叶分类云图片失败', err)
      return input
    }
  },

  async loadTeaCategoryAssets() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('categories').where({ id: 'tea' }).limit(1).get()
      const tea = res && res.data && res.data[0]
      if (!tea) return

      const subCategoryIcons = await this.resolveCloudMap(tea.subCategoryIcons || {})
      const gardenTypeIcons = await this.resolveCloudMap(tea.gardenTypeIcons || {})
      this.setData({
        teaCategoryAssets: {
          subCategoryIcons,
          gardenTypeIcons
        }
      })

      if (this.data.product) {
        const detailPresentation = this.buildDetailPresentation(this.data.product, this.data.selectedSku)
        this.setData(detailPresentation)
      }
    } catch (err) {
      console.warn('读取茶叶分类图片配置失败', err)
    }
  },

  buildDetailPresentation(product, selectedSku) {
    if (!product) {
      return {
        detailMeta: [],
        detailDescription: '',
        detailWeight: '',
        detailPerJinPrice: '0.00',
        detailImages: []
      }
    }

    const categoryImage = CATEGORY_IMAGE_MAP[product.category] || CATEGORY_IMAGE_MAP.tea
    const sourceImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter(Boolean)
      : [product.image || categoryImage]

    const detailImages = [...sourceImages]
    const teaAssets = this.data.teaCategoryAssets || {}
    const subIcon = teaAssets.subCategoryIcons && teaAssets.subCategoryIcons[product.subCategory]
    const gardenIcons = teaAssets.gardenTypeIcons || {}
    const gardenIcon = gardenIcons[product.gardenType] ||
      (product.gardenType === 'base' ? gardenIcons.garden : '')

    if (product.category === 'tea') {
      if (subIcon) detailImages.unshift(subIcon)
      if (gardenIcon) detailImages.unshift(gardenIcon)
    }

    while (detailImages.length < 3) {
      detailImages.push(sourceImages[(detailImages.length - 1) % sourceImages.length] || categoryImage)
    }

    const series = product.series || SUB_CATEGORY_LABEL_MAP[product.subCategory] || '稀有品种'
    const aroma = product.aromaType || product.aroma || '黄栀香型'
    const altitude = product.altitude || '1000米左右'
    const treeAge = product.treeAge || '70多年'
    const weight = product.netWeight ||
      (selectedSku && Array.isArray(selectedSku.specValues) && selectedSku.specValues[0]) ||
      '7克'
    const perJinRawPrice = product.pricePerJin || product.jinPrice || (selectedSku ? selectedSku.price : product.price)
    const perJinPrice = formatPrice(perJinRawPrice || 0)

    return {
      detailMeta: [
        { label: '系列', value: series },
        { label: '香型', value: aroma },
        { label: '海拔', value: altitude },
        { label: '树龄', value: treeAge }
      ],
      detailDescription: product.description || '茶汤入口柔和顺滑，回甘明显，香气有层次，耐泡度高。',
      detailWeight: weight,
      detailPerJinPrice: perJinPrice,
      detailImages: detailImages.slice(0, 3)
    }
  },

  buildPricePresentation(product, selectedSku, stockStatus) {
    const currentPriceFen = normalizePriceFen(selectedSku ? selectedSku.price : (product && product.price))
    const originalPriceFen = normalizePriceFen((product && product.originalPrice) || currentPriceFen)
    return {
      displayPrice: formatPrice(currentPriceFen),
      displayOriginalPrice: formatPrice(originalPriceFen),
      stockStatusText: getStockStatusText((stockStatus && stockStatus.status) || '')
    }
  },

  async loadProductDetail() {
    try {
      const data = await productApi.getProductDetail(this.data.productId)
      const rawProduct = data && data.product ? data.product : data
      const product = this.normalizeProduct(rawProduct)
      const reviews = data && Array.isArray(data.reviews) ? data.reviews : []

      if (!product) {
        throw new Error('商品不存在')
      }

      let selectedSku = null
      if (product.skus && product.skus.length > 0) {
        selectedSku = product.skus.find(item => item.stock > 0) || product.skus[0]
      }

      const stockStatus = checkStockStatus(product, selectedSku ? selectedSku.skuCode : null)
      const detailPresentation = this.buildDetailPresentation(product, selectedSku)
      const pricePresentation = this.buildPricePresentation(product, selectedSku, stockStatus)

      this.setData({
        product,
        reviews,
        selectedSku,
        selectedSkuLabel: selectedSku ? selectedSku.specLabel || '' : '',
        stockStatus,
        ...pricePresentation,
        ...detailPresentation,
        loading: false
      })
    } catch (err) {
      console.error('加载商品详情失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  async checkFavoriteStatus() {
    try {
      const favorites = await favoriteApi.getFavorites()
      const list = Array.isArray(favorites) ? favorites : []
      const isFavorite = list.some(item => item.productId === this.data.productId)
      this.setData({ isFavorite })
      this.setLocalFavoriteStatus(isFavorite)
    } catch (err) {
      console.error('检查收藏状态失败', err)
      const localFavorites = this.getLocalFavorites()
      this.setData({ isFavorite: localFavorites.includes(this.data.productId) })
    }
  },

  getLocalFavorites() {
    const favorites = wx.getStorageSync('localFavorites')
    return Array.isArray(favorites) ? favorites : []
  },

  setLocalFavoriteStatus(isFavorite) {
    const productId = this.data.productId
    if (!productId) return
    const favorites = this.getLocalFavorites()
    const hasFavorite = favorites.includes(productId)
    if (isFavorite && !hasFavorite) {
      favorites.push(productId)
      wx.setStorageSync('localFavorites', favorites)
      return
    }
    if (!isFavorite && hasFavorite) {
      wx.setStorageSync('localFavorites', favorites.filter(id => id !== productId))
      return
    }
    wx.setStorageSync('localFavorites', favorites)
  },

  isCloudFunctionMissing(err) {
    const message = (err && (err.message || (err.originalError && err.originalError.errMsg))) || ''
    return message.includes('FunctionName') || message.includes('function not exists')
  },

  buildBuyNowItem() {
    const product = this.data.product
    const selectedSku = this.data.selectedSku
    if (!product || !selectedSku || !selectedSku.skuCode) {
      return null
    }
    const productImage = product.images && product.images[0] ? product.images[0] : ''
    const specText = selectedSku.specLabel || (Array.isArray(selectedSku.specValues) ? selectedSku.specValues.join(' ') : '')
    return {
      productId: this.data.productId,
      productName: product.name || '商品',
      productImage,
      skuCode: selectedSku.skuCode,
      specText,
      price: Number(selectedSku.price || product.price || 0),
      quantity: 1
    }
  },

  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    })
  },

  navigateBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/index/index' })
  },

  goToCartPage() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  goHomePage() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  openShareSheet() {
    const path = `/pages/product/product?id=${this.data.productId}`
    const product = this.data.product || {}
    this.setData({
      showShareSheet: true,
      sharePath: path,
      shareTitle: product.name || '商品详情'
    })
  },

  hideShareSheet() {
    this.setData({ showShareSheet: false })
  },

  copyShareLink() {
    const path = this.data.sharePath || `/pages/product/product?id=${this.data.productId}`
    wx.setClipboardData({
      data: path,
      success: () => {
        this.hideShareSheet()
        wx.showToast({ title: '分享链接已复制', icon: 'success' })
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' })
      }
    })
  },

  showSpecSelector() {
    this.setData({ showSpecSelector: true })
  },

  hideSpecSelector() {
    this.setData({ showSpecSelector: false })
  },

  selectSku(e) {
    const { index } = e.currentTarget.dataset
    const sku = this.data.product.skus[index]

    if (sku.stock <= 0) {
      wx.showToast({
        title: '该规格已售罄',
        icon: 'none'
      })
      return
    }

    const stockStatus = checkStockStatus(this.data.product, sku.skuCode)
    const detailPresentation = this.buildDetailPresentation(this.data.product, sku)
    const pricePresentation = this.buildPricePresentation(this.data.product, sku, stockStatus)
    this.setData({
      selectedSku: sku,
      selectedSkuLabel: sku.specLabel || '',
      stockStatus,
      ...pricePresentation,
      ...detailPresentation
    })
  },

  async addToCart() {
    if (!this.data.product) {
      wx.showToast({ title: '商品信息异常', icon: 'none' })
      return
    }
    if (!this.data.selectedSku || !this.data.selectedSku.skuCode) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (this.data.selectedSku.stock <= 0) {
      wx.showToast({ title: '该规格已售罄', icon: 'none' })
      return
    }

    try {
      await cartApi.addToCart({
        productId: this.data.productId,
        skuCode: this.data.selectedSku.skuCode,
        quantity: 1
      })

      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      })

      this.loadCartCount()
      this.hideSpecSelector()
    } catch (err) {
      console.error('添加购物车失败', err)
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
    }
  },

  buyNow() {
    if (!this.data.product) {
      wx.showToast({ title: '商品信息异常', icon: 'none' })
      return
    }
    if (!this.data.selectedSku || !this.data.selectedSku.skuCode) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (this.data.selectedSku.stock <= 0) {
      wx.showToast({ title: '该规格已售罄', icon: 'none' })
      return
    }

    const buyNowItem = this.buildBuyNowItem()
    if (!buyNowItem) {
      wx.showToast({ title: '商品信息异常', icon: 'none' })
      return
    }

    wx.setStorageSync('buyNowItem', buyNowItem)
    wx.navigateTo({
      url: '/pages/order/confirm/confirm?sourceType=buy'
    })
  },

  async toggleFavorite() {
    const nextFavorite = !this.data.isFavorite
    try {
      if (this.data.isFavorite) {
        await favoriteApi.removeFavorite(this.data.productId)
        this.setData({ isFavorite: false })
        this.setLocalFavoriteStatus(false)
        wx.showToast({ title: '已取消收藏', icon: 'success' })
      } else {
        await favoriteApi.addFavorite(this.data.productId)
        this.setData({ isFavorite: true })
        this.setLocalFavoriteStatus(true)
        wx.showToast({ title: '收藏成功', icon: 'success' })
      }
    } catch (err) {
      if (this.isCloudFunctionMissing(err)) {
        this.setData({ isFavorite: nextFavorite })
        this.setLocalFavoriteStatus(nextFavorite)
        wx.showToast({ title: nextFavorite ? '收藏成功' : '已取消收藏', icon: 'success' })
        return
      }
      console.error('收藏操作失败', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  onShareAppMessage() {
    const product = this.data.product || {}
    this.hideShareSheet()
    return {
      title: this.data.shareTitle || product.name || '商品详情',
      path: this.data.sharePath || `/pages/product/product?id=${this.data.productId}`,
      imageUrl: product.images && product.images[0] ? product.images[0] : ''
    }
  },

  viewMoreReviews() {
    wx.navigateTo({
      url: `/pages/review/list/list?productId=${this.data.productId}`
    })
  },

  contactService() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service'
    })
  },

  formatPrice(price) {
    return formatPrice(price)
  },

  getMemberPrice(price) {
    return formatPrice(calculateMemberPrice(price, this.data.memberLevel))
  },

  getMemberDiscount() {
    return getMemberDiscount(this.data.memberLevel)
  },

  getStockStatusText(status) {
    return getStockStatusText(status)
  }
})
