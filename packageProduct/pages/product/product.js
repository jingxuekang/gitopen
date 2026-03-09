// pages/product/product.js
const { productApi, cartApi, favoriteApi } = require('/utils/api.js')
const {
  formatPrice,
  calculateMemberPrice,
  getMemberDiscount,
  checkStockStatus,
  getStockStatusText,
  getStorage,
  normalizeSpecText
} = require('/utils/util.js')

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
    selectedSpecValues: [],
    specGroups: [],
    specAction: 'cart',
    buyQuantity: 1,
    modalPrice: '0.00',
    modalStock: 0,
    isFavorite: false,
    loading: true,
    memberLevel: 0,
    showSpecInfo: false,
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
    detailTitle: '',
    brewAdvice: '建议选用盖碗或紫砂壶，80-85度冲泡（纯净水/矿泉水等），无需盖盖，坐杯1~3s即可出汤。',
    claySuitability: '段泥类>绿泥类>紫泥类',
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
    const defaultSkuCode = `DEFAULT_${product._id || 'SKU'}`
    const skus = Array.isArray(product.skus)
      ? product.skus.map((item, index) => {
        const specValues = Array.isArray(item && item.specValues) && item.specValues.length > 0
          ? item.specValues
          : ['Default:Standard']

        return {
          ...item,
          skuCode: item && item.skuCode ? item.skuCode : `${defaultSkuCode}_${index}`,
          specValues,
          price: normalizePriceFen(item && item.price),
          stock: Math.max(0, Number(item && item.stock) || 0),
          priceText: formatPrice(normalizePriceFen(item && item.price)),
          specLabel: this.formatSkuSpecLabel(specValues, product)
        }
      })
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

  normalizeDetailText(value) {
    return normalizeSpecText(String(value || '')).trim()
  },

  stripSpecLabel(text) {
    const content = String(text || '').trim()
    const match = content.match(/^[^:\uff1a]+[:\uff1a]\s*(.+)$/)
    return match ? match[1].trim() : content
  },

  getSpecValueByLabels(specValues = [], labels = []) {
    const normalizedLabels = Array.isArray(labels) ? labels : []
    const list = Array.isArray(specValues) ? specValues : []

    for (let i = 0; i < list.length; i += 1) {
      const normalized = this.normalizeDetailText(list[i])
      if (!normalized) continue

      const match = normalized.match(/^([^:\uff1a]+)[:\uff1a]\s*(.+)$/)
      if (match) {
        const label = String(match[1] || '').trim()
        const value = String(match[2] || '').trim()
        if (normalizedLabels.some((key) => label.includes(key))) {
          return value
        }
      }

      const stripped = this.stripSpecLabel(normalized)
      if (normalizedLabels.some((key) => normalized.includes(key) || stripped.includes(key))) {
        return stripped
      }
    }

    return ''
  },

  buildDetailPresentation(product, selectedSku) {
    if (!product) {
      return {
        detailMeta: [],
        detailDescription: '',
        detailTitle: '',
        brewAdvice: '建议选用盖碗或紫砂壶，80-85度冲泡（纯净水/矿泉水等），无需盖盖，坐杯1~3s即可出汤。',
        claySuitability: '段泥类>绿泥类>紫泥类',
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

    const series = this.normalizeDetailText(
      product.series || SUB_CATEGORY_LABEL_MAP[product.subCategory] || product.subCategory || '\u7a00\u6709\u54c1\u79cd'
    )
    const aroma = this.normalizeDetailText(product.aromaType || product.aroma || '\u9ec4\u6800\u9999\u578b')
    const altitude = this.normalizeDetailText(product.altitude || '1000\u7c73\u5de6\u53f3')
    const treeAge = this.normalizeDetailText(product.treeAge || '70\u591a\u5e74')
    const specWeight = this.getSpecValueByLabels(
      selectedSku && Array.isArray(selectedSku.specValues) ? selectedSku.specValues : [],
      ['\u51c0\u542b\u91cf', '\u91cd\u91cf', '\u514b\u91cd', '\u5bb9\u91cf']
    )
    const weight = this.normalizeDetailText(
      product.netWeight || product.weight || specWeight || '7\u514b'
    )
    const perJinRawPrice = product.pricePerJin || product.jinPrice || (selectedSku ? selectedSku.price : product.price)
    const perJinPrice = formatPrice(perJinRawPrice || 0)

    const nameText = String(product.name || '')
    const yearText = String(product.year || product.rawYear || product.materialYear || '')
    const isBaihaoyinzhen2020 = nameText.includes('白毫银针') && (yearText.includes('2020') || nameText.includes('2020'))

    if (isBaihaoyinzhen2020) {
      return {
        detailTitle: '2020年 白毫银针',
        detailMeta: [
          { label: '等 级', value: '特级' },
          { label: '原 料', value: '茶鲜叶' },
          { label: '原料年份', value: '2020年' },
          { label: '地 址', value: '福建省宁德市福鼎市点头镇上宅村银坑26-2号' },
          { label: '执行标准', value: 'GB/T 22291' }
        ],
        detailDescription: '经五年陈化，毫香转化为蜜韵与熟果香交织的复合香气，入口醇和顺滑如丝绸，汤感饱满稠润，已褪去新茶的清冽而初显老茶的温润底蕴。',
        brewAdvice: '建议选用盖碗或紫砂壶，80-85度冲泡（纯净水/矿泉水等），无需盖盖，坐杯1~3s即可出汤。',
        claySuitability: '段泥类>绿泥类>紫泥类',
        detailWeight: weight,
        detailPerJinPrice: perJinPrice,
        detailImages: detailImages.slice(0, 3)
      }
    }

    return {
      detailTitle: '',
      detailMeta: [
        { label: '系列', value: series },
        { label: '香型', value: aroma },
        { label: '海拔', value: altitude },
        { label: '树龄', value: treeAge }
      ],
      detailDescription: product.description || '茶汤入口柔和顺滑，回甘明显，香气有层次，耐泡度高。',
      brewAdvice: this.data.brewAdvice,
      claySuitability: this.data.claySuitability,
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
      const selectedSpecValues = this.extractSelectedSpecValues(selectedSku, product)
      const specGroups = this.buildSpecGroups(product, selectedSpecValues)

      this.setData({
        product,
        reviews,
        selectedSku,
        selectedSkuLabel: selectedSku ? (selectedSku.specLabel || this.formatSkuSpecLabel(selectedSku.specValues, product)) : '',
        selectedSpecValues,
        specGroups,
        modalPrice: selectedSku ? formatPrice(selectedSku.price || product.price || 0) : formatPrice(product.price || 0),
        modalStock: selectedSku ? (selectedSku.stock || 0) : (product.stock || 0),
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
    const localFavorites = this.getLocalFavorites()
    const localHasFavorite = localFavorites.includes(this.data.productId)

    try {
      const favorites = await favoriteApi.getFavorites()
      const list = Array.isArray(favorites) ? favorites : []
      const cloudHasFavorite = list.some(item => item.productId === this.data.productId)

      if (cloudHasFavorite) {
        this.setData({ isFavorite: true })
        this.setLocalFavoriteStatus(true)
        return
      }

      if (localHasFavorite) {
        try {
          await favoriteApi.addFavorite(this.data.productId)
        } catch (syncErr) {
          console.warn('本地收藏同步云端失败', syncErr)
        }
        this.setData({ isFavorite: true })
        this.setLocalFavoriteStatus(true)
        return
      }

      this.setData({ isFavorite: false })
    } catch (err) {
      console.error('检查收藏状态失败', err)
      this.setData({ isFavorite: localHasFavorite })
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

  getSpecFallbackGroup(index, product) {
    const specs = product && Array.isArray(product.specs) ? product.specs : []
    const specInfo = specs[index] || null
    if (specInfo && typeof specInfo === 'object') {
      const name = specInfo.name || specInfo.label || specInfo.title || specInfo.key
      if (name) return String(name).trim()
    }
    if (specInfo !== undefined && specInfo !== null) {
      const text = String(specInfo).trim()
      if (text) return text
    }
    return `Spec${index + 1}`
  },

  parseSpecToken(rawValue, index, product) {
    const fallbackGroup = this.getSpecFallbackGroup(index, product)

    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      const rawGroup = rawValue.group || rawValue.label || rawValue.name || rawValue.key || rawValue.specName || rawValue.attrName
      const rawOption = rawValue.value || rawValue.text || rawValue.option || rawValue.specValue || rawValue.attrValue
      const group = rawGroup === undefined || rawGroup === null ? '' : String(rawGroup).trim()
      const value = rawOption === undefined || rawOption === null ? '' : String(rawOption).trim()
      if (group || value) {
        return {
          group: group || fallbackGroup,
          value: value || group || `Option${index + 1}`
        }
      }
    }

    if (Array.isArray(rawValue)) {
      const mergedText = rawValue
        .map(item => (item === undefined || item === null ? '' : String(item).trim()))
        .filter(Boolean)
        .join(' ')
      return {
        group: fallbackGroup,
        value: mergedText || `Option${index + 1}`
      }
    }

    const text = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim()
    const colonIndex = text.indexOf(':')
    if (colonIndex >= 0) {
      return {
        group: text.slice(0, colonIndex).trim() || fallbackGroup,
        value: text.slice(colonIndex + 1).trim() || text.trim()
      }
    }
    return {
      group: fallbackGroup,
      value: text.trim() || `Option${index + 1}`
    }
  },

  formatSkuSpecLabel(specValues, product) {
    if (!Array.isArray(specValues)) return ''
    const raw = specValues
      .map((token, index) => this.parseSpecToken(token, index, product))
      .map((item) => `${item.group}:${item.value}`)
      .join(' ')
      .trim()
    return normalizeSpecText(raw)
  },

  extractSelectedSpecValues(sku, product) {
    if (!sku || !Array.isArray(sku.specValues)) return []
    return sku.specValues.map((token, index) => this.parseSpecToken(token, index, product).value)
  },

  getSkuInfoList(product) {
    const skus = product && Array.isArray(product.skus) ? product.skus : []
    return skus.map((sku) => ({
      sku,
      values: (Array.isArray(sku.specValues) ? sku.specValues : [])
        .map((token, index) => this.parseSpecToken(token, index, product))
    }))
  },

  getSpecDimensionCount(product) {
    const skuInfos = this.getSkuInfoList(product)
    return skuInfos.reduce((max, item) => Math.max(max, item.values.length), 0)
  },

  findMatchingSku(product, selectedValues, needFullMatch = false, onlyInStock = true) {
    const skuInfos = this.getSkuInfoList(product)
    const dimensionCount = this.getSpecDimensionCount(product)

    if (needFullMatch) {
      for (let i = 0; i < dimensionCount; i += 1) {
        if (!selectedValues[i]) return null
      }
    }

    const matched = skuInfos.filter((item) => {
      if (onlyInStock && (item.sku.stock || 0) <= 0) return false
      for (let i = 0; i < selectedValues.length; i += 1) {
        const expected = selectedValues[i]
        if (!expected) continue
        const current = item.values[i] ? item.values[i].value : ""
        if (current !== expected) return false
      }
      return true
    })

    if (!matched.length) return null
    const inStockFirst = matched.find(item => (item.sku.stock || 0) > 0)
    return (inStockFirst || matched[0]).sku
  },

  findSkuByGroupValue(product, groupIndex, optionValue, onlyInStock = true) {
    const skuInfos = this.getSkuInfoList(product)
    const matched = skuInfos.filter((item) => {
      if (onlyInStock && (item.sku.stock || 0) <= 0) return false
      const info = item.values[groupIndex]
      return info && info.value === optionValue
    })
    if (!matched.length) return null
    const inStockFirst = matched.find(item => (item.sku.stock || 0) > 0)
    return (inStockFirst || matched[0]).sku
  },

  buildSpecGroups(product, selectedValues = []) {
    const skuInfos = this.getSkuInfoList(product)
    const dimensionCount = this.getSpecDimensionCount(product)
    const groups = []

    for (let i = 0; i < dimensionCount; i += 1) {
      let label = `规格${i + 1}`
      const optionValues = []

      skuInfos.forEach((item) => {
        const info = item.values[i]
        if (!info) return
        label = info.group || label
        if (!optionValues.includes(info.value)) optionValues.push(info.value)
      })

      const options = optionValues.map((optionValue) => {
        const candidate = selectedValues.slice()
        candidate[i] = optionValue
        let available = !!this.findMatchingSku(product, candidate, false, true)
        if (!available) {
          available = !!this.findSkuByGroupValue(product, i, optionValue, true)
        }
        return {
          value: normalizeSpecText(optionValue),
          rawValue: optionValue,
          disabled: !available
        }
      })

      groups.push({
        index: i,
        label: normalizeSpecText(label),
        options
      })
    }

    return groups
  },

  syncSpecViewBySku(sku, selectedValues) {
    if (!sku || !this.data.product) return
    const product = this.data.product
    const stockStatus = checkStockStatus(product, sku.skuCode)
    const detailPresentation = this.buildDetailPresentation(product, sku)
    const pricePresentation = this.buildPricePresentation(product, sku, stockStatus)
    const maxQuantity = sku.stock > 0 ? sku.stock : 1
    const buyQuantity = Math.max(1, Math.min(this.data.buyQuantity || 1, maxQuantity))

    this.setData({
      selectedSku: sku,
      selectedSkuLabel: sku.specLabel || this.formatSkuSpecLabel(sku.specValues, product),
      selectedSpecValues: selectedValues,
      specGroups: this.buildSpecGroups(product, selectedValues),
      modalPrice: formatPrice(sku.price || product.price || 0),
      modalStock: sku.stock || 0,
      buyQuantity,
      stockStatus,
      ...pricePresentation,
      ...detailPresentation
    })
  },

  getBuyQuantityLimit() {
    const stockLimit = Number(this.data.modalStock || 0)
    if (!Number.isFinite(stockLimit) || stockLimit <= 0) {
      return 1
    }
    return Math.max(1, Math.floor(stockLimit))
  },

  setBuyQuantity(value, options = {}) {
    const { silent = false } = options
    const maxQuantity = this.getBuyQuantityLimit()
    let nextQuantity = Math.floor(Number(value))

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      nextQuantity = 1
      if (!silent) {
        wx.showToast({ title: '\u6570\u91cf\u81f3\u5c11\u4e3a1', icon: 'none' })
      }
    }

    if (maxQuantity > 0 && nextQuantity > maxQuantity) {
      nextQuantity = maxQuantity
      if (!silent) {
        wx.showToast({ title: `\u6700\u591a\u53ef\u4e70${maxQuantity}\u4ef6`, icon: 'none' })
      }
    }

    this.setData({ buyQuantity: nextQuantity })
    return nextQuantity
  },

  onBuyQuantityBlur(e) {
    const inputValue = e && e.detail ? e.detail.value : ''
    this.setBuyQuantity(inputValue)
  },

  buildBuyNowItem(quantity = 1) {
    const product = this.data.product
    const selectedSku = this.data.selectedSku
    if (!product || !selectedSku || !selectedSku.skuCode) {
      return null
    }
    const productImage = product.images && product.images[0] ? product.images[0] : ''
    const specText = normalizeSpecText(
      selectedSku.specLabel ||
      this.formatSkuSpecLabel(selectedSku.specValues, product) ||
      (Array.isArray(selectedSku.specValues) ? selectedSku.specValues.join(' ') : '')
    )
    return {
      productId: this.data.productId,
      productName: product.name || '商品',
      productImage,
      skuCode: selectedSku.skuCode,
      specText,
      price: Number(selectedSku.price || product.price || 0),
      quantity
    }
  },

  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    })
  },

  toggleSpecInfo() {
    this.setData({ showSpecInfo: !this.data.showSpecInfo })
  },

  navigateBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/index/index' })
  },

  goToCartPage() {
    wx.reLaunch({ url: '/pages/cart/cart' })
  },

  goHomePage() {
    wx.reLaunch({ url: '/pages/index/index' })
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

  openSpecSelector(actionOrEvent) {
    let action = 'cart'
    if (typeof actionOrEvent === 'string') {
      action = actionOrEvent
    } else if (actionOrEvent && actionOrEvent.currentTarget && actionOrEvent.currentTarget.dataset) {
      action = actionOrEvent.currentTarget.dataset.action || 'cart'
    }

    const product = this.data.product
    if (!product || !Array.isArray(product.skus) || product.skus.length === 0) {
      wx.showToast({ title: '当前商品暂无可选规格', icon: 'none' })
      return
    }

    let selectedSku = this.data.selectedSku
    if (!selectedSku || !selectedSku.skuCode) {
      selectedSku = this.findMatchingSku(product, this.data.selectedSpecValues || [], false, true)
    }
    if (!selectedSku) {
      wx.showToast({ title: '当前无可售规格', icon: 'none' })
      return
    }

    const selectedSpecValues = this.extractSelectedSpecValues(selectedSku, product)
    this.syncSpecViewBySku(selectedSku, selectedSpecValues)
    this.setData({
      showSpecSelector: true,
      specAction: action
    })
  },

  hideSpecSelector() {
    this.setData({ showSpecSelector: false })
  },

  noop() {},

  onSpecOptionTap(e) {
    const disabled = !!e.currentTarget.dataset.disabled
    if (disabled) return

    const groupIndex = Number(e.currentTarget.dataset.groupIndex)
    const value = e.currentTarget.dataset.value || ''
    const selectedValues = (this.data.selectedSpecValues || []).slice()
    selectedValues[groupIndex] = value

    const product = this.data.product
    let matchedSku = this.findMatchingSku(product, selectedValues, true, true)
    if (!matchedSku) {
      matchedSku = this.findMatchingSku(product, selectedValues, false, true)
    }
    if (!matchedSku) {
      matchedSku = this.findSkuByGroupValue(product, groupIndex, value, true)
    }
    if (!matchedSku) {
      matchedSku = this.findSkuByGroupValue(product, groupIndex, value, false)
    }

    if (matchedSku) {
      const normalizedValues = this.extractSelectedSpecValues(matchedSku, product)
      this.syncSpecViewBySku(matchedSku, normalizedValues)
      return
    }

    this.setData({
      selectedSpecValues: selectedValues,
      specGroups: this.buildSpecGroups(product, selectedValues)
    })
  },

  decreaseBuyQuantity() {
    const currentQuantity = Math.max(1, Number(this.data.buyQuantity || 1))
    const nextQuantity = Math.max(1, currentQuantity - 1)
    this.setBuyQuantity(nextQuantity, { silent: true })
  },

  increaseBuyQuantity() {
    const currentQuantity = Math.max(1, Number(this.data.buyQuantity || 1))
    const maxQuantity = this.getBuyQuantityLimit()
    if (currentQuantity >= maxQuantity) {
      wx.showToast({ title: `\u6700\u591a\u53ef\u4e70${maxQuantity}\u4ef6`, icon: 'none' })
      return
    }
    this.setBuyQuantity(currentQuantity + 1, { silent: true })
  },

  confirmAddToCart() {
    this.confirmSpecAction('cart')
  },

  confirmBuyNow() {
    this.confirmSpecAction('buy')
  },

  async confirmSpecAction(action) {
    const product = this.data.product
    const selectedSku = this.data.selectedSku
    const selectedValues = this.data.selectedSpecValues || []
    const currentAction = action || this.data.specAction || 'cart'
    const dimensionCount = this.getSpecDimensionCount(product)
    const isComplete = dimensionCount === 0 || selectedValues.filter(Boolean).length >= dimensionCount

    if (!isComplete) {
      wx.showToast({ title: '请选择完整规格', icon: 'none' })
      return
    }
    if (!selectedSku || !selectedSku.skuCode) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if ((selectedSku.stock || 0) <= 0) {
      wx.showToast({ title: '该规格已售罄', icon: 'none' })
      return
    }

    if (currentAction === 'buy') {
      this.buyNowInternal()
      return
    }
    await this.addToCartInternal()
  },

  addToCart() {
    this.openSpecSelector('cart')
  },

  buyNow() {
    this.openSpecSelector('buy')
  },

  async addToCartInternal() {
    if (!this.data.product || !this.data.selectedSku || !this.data.selectedSku.skuCode) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }

    const quantity = Math.max(1, Number(this.data.buyQuantity || 1))
    if ((this.data.selectedSku.stock || 0) < quantity) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }

    try {
      await cartApi.addToCart({
        productId: this.data.productId,
        skuCode: this.data.selectedSku.skuCode,
        quantity
      })

      wx.showToast({ title: '已加入购物车', icon: 'success' })
      this.loadCartCount()
      this.hideSpecSelector()
      this.setData({ buyQuantity: 1 })
    } catch (err) {
      console.error('添加购物车失败', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  buyNowInternal() {
    if (!this.data.product || !this.data.selectedSku || !this.data.selectedSku.skuCode) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }

    const quantity = Math.max(1, Number(this.data.buyQuantity || 1))
    if ((this.data.selectedSku.stock || 0) < quantity) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }

    const buyNowItem = this.buildBuyNowItem(quantity)
    if (!buyNowItem) {
      wx.showToast({ title: '商品信息异常', icon: 'none' })
      return
    }

    wx.setStorageSync('buyNowItem', buyNowItem)
    this.hideSpecSelector()
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

  goToProductTrace() {
    const product = this.data.product || {}
    const type = product.category || 'tea'
    const productId = this.data.productId || ''
    wx.navigateTo({
      url: `/pages/trace/source/source?type=${type}&productId=${productId}`
    })
  },

  contactService() {
    wx.navigateTo({
      url: `/pages/customer-service/customer-service?from=product&productId=${this.data.productId}`
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
