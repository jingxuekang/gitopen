// pages/category/category.js
const { productApi } = require('../../utils/api.js')
const { formatPrice, calculateMemberPrice } = require('../../utils/util.js')
const { handleError } = require('../../utils/errorHandler.js')

const CATEGORY_IMAGE_MAP = {
  tea: '/images/category/tea.png',
  chenpi: '/images/category/chenpi.png',
  teapot: '/images/category/teapot.png'
}

const TEA_SUB_CATEGORY_MAP = {
  '银针': 'yinzhen',
  '牡丹': 'mudan',
  '寿眉': 'shoumei',
  '贡眉': 'gongmei'
}

function normalizeTeaSubCategory(input = '') {
  return TEA_SUB_CATEGORY_MAP[input] || input
}

const TEA_SUB_CATEGORY_LABEL_MAP = {
  yinzhen: '银针',
  mudan: '牡丹',
  shoumei: '寿眉',
  gongmei: '贡眉'
}

const CHENPI_ORIGIN_LABEL_MAP = {
  yixian: '一线',
  meijian: '梅江',
  chajiao: '茶坑',
  tianma: '天马',
  xitian: '西甲',
  dongjia: '东甲',
  other: '其他'
}

const TEAPOT_SHAPE_LABEL_MAP = {
  ziyeshipiao: '子冶石瓢',
  dezhong: '德钟',
  duozhi: '掇只'
}

const TEAPOT_MATERIAL_LABEL_MAP = {
  zini: '紫泥',
  putongzini: '普通紫泥',
  tianqingni: '天青泥',
  dicaoqing: '底槽清',
  hongpilong: '红皮龙',
  duanni: '段泥'
}

const TEAPOT_CRAFT_LABEL_MAP = {
  full: '全手工',
  half: '半手工'
}

const YEAR_LABEL_MAP = {
  '1': '一年',
  '3': '三年',
  '5': '五年',
  '10': '十年',
  '15': '十五年',
  '10+': '十年以上',
  '15+': '十五年以上'
}

const YEAR_LABEL_TO_ID_MAP = {
  '一年': '1',
  '三年': '3',
  '五年': '5',
  '十年': '10',
  '十五年': '15',
  '十年以上': '10+',
  '十五年以上': '15+'
}

function normalizeTeaSubCategoryCode(input = '') {
  const value = String(input || '').toLowerCase()
  if (!value) return ''
  if (value.indexOf('yinzhen') !== -1 || value.indexOf('银针') !== -1) return 'yinzhen'
  if (value.indexOf('mudan') !== -1 || value.indexOf('牡丹') !== -1) return 'mudan'
  if (value.indexOf('shoumei') !== -1 || value.indexOf('寿眉') !== -1) return 'shoumei'
  if (value.indexOf('gongmei') !== -1 || value.indexOf('贡眉') !== -1) return 'gongmei'
  return value
}

function normalizeYearId(input = '') {
  const value = String(input || '').trim()
  if (!value) return ''
  if (YEAR_LABEL_MAP[value]) return value
  if (YEAR_LABEL_TO_ID_MAP[value]) return YEAR_LABEL_TO_ID_MAP[value]
  if (value.indexOf('十五') !== -1 && value.indexOf('以上') !== -1) return '15+'
  if (value.indexOf('十') !== -1 && value.indexOf('以上') !== -1) return '10+'
  if (value.indexOf('十五') !== -1) return '15'
  if (value.indexOf('十') !== -1) return '10'
  if (value.indexOf('五') !== -1 || value === '5') return '5'
  if (value.indexOf('三') !== -1 || value === '3') return '3'
  if (value.indexOf('一') !== -1 || value === '1') return '1'
  return value
}

Page({
  data: {
    categories: [
      { id: 'tea', name: '茶叶' },
      { id: 'chenpi', name: '陈皮' },
      { id: 'teapot', name: '紫砂壶' }
    ],
    currentCategory: 'tea',
    teaFirstLevel: [
      { id: 'fuding', name: '福鼎白茶' }
    ],
    currentFirstLevel: 'fuding',
    
    // 茶叶分类筛选项（白茶品种）
    teaFilters: {
      type: {
        name: '品类',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: 'yinzhen', name: '银针' },
          { id: 'mudan', name: '牡丹' },
          { id: 'shoumei', name: '寿眉' },
          { id: 'gongmei', name: '贡眉' }
        ],
        selected: 'all'
      },
      age: {
        name: '年份',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: '1', name: '一年' },
          { id: '3', name: '三年' },
          { id: '5', name: '五年' },
          { id: '10', name: '十年' },
          { id: '15', name: '十五年' },
          { id: '15+', name: '十五年以上' }
        ],
        selected: 'all'
      }
    },
    
    // 陈皮分类筛选项
    chenpiFilters: {
      origin: {
        name: '产区',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: 'yixian', name: '一线' },
          { id: 'meijian', name: '梅江' },
          { id: 'chajiao', name: '茶坑' },
          { id: 'tianma', name: '天马' },
          { id: 'xitian', name: '西甲' },
          { id: 'dongjia', name: '东甲' },
          { id: 'other', name: '其他' }
        ],
        selected: 'all'
      },
      age: {
        name: '年份',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: '3', name: '三年' },
          { id: '5', name: '五年' },
          { id: '10', name: '十年' },
          { id: '10+', name: '十年以上' }
        ],
        selected: 'all'
      }
    },
    
    // 紫砂壶分类筛选项
    teapotFilters: {
      shape: {
        name: '器型',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: 'ziyeshipiao', name: '子冶石瓢' },
          { id: 'dezhong', name: '德钟' },
          { id: 'duozhi', name: '掇只' }
        ],
        selected: 'all'
      },
      material: {
        name: '泥料',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: 'zini', name: '紫泥' },
          { id: 'putongzini', name: '普通紫泥' },
          { id: 'tianqingni', name: '天青泥' },
          { id: 'dicaoqing', name: '底槽清' },
          { id: 'hongpilong', name: '红皮龙' },
          { id: 'duanni', name: '段泥' }
        ],
        selected: 'all'
      },
      craft: {
        name: '成型方式',
        expanded: false,
        options: [
          { id: 'all', name: '全部' },
          { id: 'full', name: '全手工' },
          { id: 'half', name: '半手工' }
        ],
        selected: 'all'
      }
    },
    
    products: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    error: false,
    errorMessage: '',
    memberLevel: 0, // 用户会员等级
    teaCategoryAssets: {
      subCategoryIcons: {},
      gardenTypeIcons: {}
    },
    teaCheckReport: null
  },

  onLoad(options) {
    if (options.category) {
      this.setData({ currentCategory: options.category })
    }
    this.loadTeaCategoryAssets()
    this.runOneShotTeaCheck()
    this.loadUserProfile()
    this.loadProducts()
  },

  // 页面显示时重新加载用户信息
  onShow() {
    this.loadUserProfile()
  },

  // 加载用户资料
  async loadUserProfile() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getUserProfile'
      })
      
      if (result.result.success) {
        this.setData({
          memberLevel: result.result.data.memberLevel || 0
        })
      }
    } catch (err) {
      // 静默失败，不影响主流程
      console.error('加载用户信息失败', err)
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
      console.warn('解析分类云图片失败', err)
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
      this.applyTeaTypeOptionIcons(subCategoryIcons)

      if (this.data.currentCategory === 'tea' && this.data.products.length) {
        this.setData({
          products: this.decorateProducts(this.data.products)
        })
      }
    } catch (err) {
      console.warn('读取茶叶分类图片配置失败', err)
    }
  },

  applyTeaTypeOptionIcons(subCategoryIcons = {}) {
    const teaFilters = this.data.teaFilters || {}
    const typeFilter = teaFilters.type || {}
    const options = Array.isArray(typeFilter.options) ? typeFilter.options : []
    if (!options.length) return

    const mappedOptions = options.map((option) => {
      if (!option || option.id === 'all') return option
      return {
        ...option,
        icon: subCategoryIcons[option.id] || ''
      }
    })

    this.setData({
      'teaFilters.type.options': mappedOptions
    })
  },

  async fetchAllByWhere(collection, where = {}, limit = 500, batchSize = 100) {
    const db = wx.cloud.database()
    const all = []
    let offset = 0

    while (offset < limit) {
      const res = await db.collection(collection)
        .where(where)
        .skip(offset)
        .limit(batchSize)
        .get()
      const rows = Array.isArray(res.data) ? res.data : []
      if (!rows.length) break
      all.push(...rows)
      if (rows.length < batchSize) break
      offset += batchSize
    }

    return all
  },

  buildTeaCheckReport(teaDoc, teaProducts = []) {
    const typeOptions = (((this.data.teaFilters || {}).type || {}).options || [])
      .filter((item) => item && item.id && item.id !== 'all')
    const yearOptions = (((this.data.teaFilters || {}).age || {}).options || [])
      .filter((item) => item && item.id && item.id !== 'all')

    const subCategoryIcons = (teaDoc && teaDoc.subCategoryIcons) || {}
    const gardenTypeIcons = (teaDoc && teaDoc.gardenTypeIcons) || {}

    const byType = {}
    typeOptions.forEach((item) => {
      byType[item.id] = 0
    })

    const byYear = {}
    yearOptions.forEach((item) => {
      byYear[item.id] = 0
    })

    const unknownSubCategoryValues = {}
    teaProducts.forEach((p) => {
      const subCode = normalizeTeaSubCategoryCode(p && p.subCategory)
      if (byType[subCode] !== undefined) {
        byType[subCode] += 1
      } else {
        const raw = String((p && p.subCategory) || '未填')
        unknownSubCategoryValues[raw] = (unknownSubCategoryValues[raw] || 0) + 1
      }

      const yearId = normalizeYearId(p && p.year)
      if (byYear[yearId] !== undefined) {
        byYear[yearId] += 1
      }
    })

    const missingTypeIcons = typeOptions
      .map((item) => item.id)
      .filter((id) => !subCategoryIcons[id])
    const missingTypeProducts = Object.keys(byType).filter((id) => byType[id] === 0)
    const missingGardenIcons = ['garden', 'base', 'wild'].filter((id) => !gardenTypeIcons[id])

    return {
      checkedAt: Date.now(),
      teaCategoryDocFound: !!teaDoc,
      totalTeaProducts: teaProducts.length,
      byType,
      byYear,
      missingTypeIcons,
      missingTypeProducts,
      missingGardenIcons,
      unknownSubCategoryValues
    }
  },

  async runOneShotTeaCheck() {
    try {
      const db = wx.cloud.database()
      const categoryRes = await db.collection('categories').where({ id: 'tea' }).limit(1).get()
      const teaDoc = categoryRes && categoryRes.data && categoryRes.data[0]
      const teaProducts = await this.fetchAllByWhere('products', { category: 'tea' })
      const report = this.buildTeaCheckReport(teaDoc, teaProducts)

      this.setData({ teaCheckReport: report })
      console.warn('[茶叶配置一次性检查]', report)
    } catch (err) {
      console.warn('茶叶配置一次性检查失败', err)
    }
  },

  decorateProducts(list = []) {
    const input = Array.isArray(list) ? list : []
    const teaAssets = this.data.teaCategoryAssets || {}
    const subCategoryIcons = teaAssets.subCategoryIcons || {}
    const gardenTypeIcons = teaAssets.gardenTypeIcons || {}
    const isTeaCategory = this.data.currentCategory === 'tea'

    return input.map((product) => {
      if (!product) return product

      const baseImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images.filter(Boolean)
        : [product.image].filter(Boolean)

      const fallback = CATEGORY_IMAGE_MAP[product.category] || CATEGORY_IMAGE_MAP.tea

      if (!isTeaCategory || product.category !== 'tea') {
        return {
          ...product,
          images: baseImages.length ? baseImages : [fallback]
        }
      }

      const normalizedSubCategory = normalizeTeaSubCategory(product.subCategory)
      const subIcon = subCategoryIcons[normalizedSubCategory]
      const gardenIcon = gardenTypeIcons[product.gardenType] ||
        (product.gardenType === 'base' ? gardenTypeIcons.garden : '')
      const headImages = [gardenIcon, subIcon].filter(Boolean)
      const images = [...headImages, ...baseImages.filter((src) => headImages.indexOf(src) === -1)]

      return {
        ...product,
        subCategory: normalizedSubCategory || product.subCategory,
        images: images.length ? images : [CATEGORY_IMAGE_MAP.tea]
      }
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadProducts(true)
    }
  },

  // 切换分类
  switchCategory(e) {
    const { category } = e.currentTarget.dataset
    if (category === this.data.currentCategory) return

    // 重置所有筛选条件
    this.resetFilters(category)

    this.setData({
      currentCategory: category,
      products: [],
      page: 1,
      hasMore: true,
      error: false
    })
    this.loadProducts()
  },

  switchFirstLevel(e) {
    const firstLevel = e.currentTarget.dataset.firstLevel || 'fuding'
    if (firstLevel === this.data.currentFirstLevel) return
    this.setData({
      currentFirstLevel: firstLevel,
      products: [],
      page: 1,
      hasMore: true,
      error: false
    })
    this.loadProducts()
  },

  // 重置筛选条件
  resetFilters(category) {
    const filterKey = `${category}Filters`
    const filters = this.data[filterKey]
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        filters[key].selected = 'all'
        filters[key].expanded = false
      })
      this.setData({
        [filterKey]: filters
      })
    }
  },

  // 切换筛选项展开/收起
  toggleFilter(e) {
    const { filter } = e.currentTarget.dataset
    const filterKey = `${this.data.currentCategory}Filters`
    const filters = this.data[filterKey]
    
    if (filters && filters[filter]) {
      filters[filter].expanded = !filters[filter].expanded
      this.setData({
        [filterKey]: filters
      })
    }
  },

  // 选择筛选项
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

  // 获取当前筛选条件
  getCurrentFilters() {
    const filterKey = `${this.data.currentCategory}Filters`
    const filters = this.data[filterKey]
    const result = {}
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const selected = filters[key].selected
        if (selected && selected !== 'all') {
          // 对齐云函数字段，避免参数名不匹配导致 500
          if (this.data.currentCategory === 'tea') {
            if (key === 'type') result.subCategory = selected
            else if (key === 'age') result.year = selected
            else if (key === 'garden') result.gardenType = selected
          } else if (this.data.currentCategory === 'chenpi') {
            if (key === 'origin') result.origin = selected
            else if (key === 'age') result.year = selected
          } else if (this.data.currentCategory === 'teapot') {
            if (key === 'shape') result.subCategory = selected
            else if (key === 'material') result.material = selected
            else if (key === 'craft') result.craftType = selected
          } else {
            result[key] = selected
          }
        }
      })
    }
    
    return result
  },

  normalizeValueList(values = []) {
    return values
      .filter((v) => v !== undefined && v !== null && v !== '')
      .map((v) => String(v))
  },

  normalizeByCategoryFilters(filters = {}) {
    const normalized = {}

    if (filters.subCategory) {
      if (this.data.currentCategory === 'tea') {
        normalized.subCategory = this.normalizeValueList([
          filters.subCategory,
          TEA_SUB_CATEGORY_LABEL_MAP[filters.subCategory]
        ])
      } else if (this.data.currentCategory === 'teapot') {
        normalized.subCategory = this.normalizeValueList([
          filters.subCategory,
          TEAPOT_SHAPE_LABEL_MAP[filters.subCategory]
        ])
      } else {
        normalized.subCategory = this.normalizeValueList([filters.subCategory])
      }
    }

    if (filters.year) {
      normalized.year = this.normalizeValueList([
        filters.year,
        YEAR_LABEL_MAP[filters.year]
      ])
    }

    if (filters.gardenType) {
      normalized.gardenType = this.normalizeValueList([filters.gardenType])
    }

    if (filters.origin) {
      normalized.origin = this.normalizeValueList([
        filters.origin,
        CHENPI_ORIGIN_LABEL_MAP[filters.origin]
      ])
    }

    if (filters.material) {
      normalized.material = this.normalizeValueList([
        filters.material,
        TEAPOT_MATERIAL_LABEL_MAP[filters.material]
      ])
    }

    if (filters.craftType) {
      normalized.craftType = this.normalizeValueList([
        filters.craftType,
        TEAPOT_CRAFT_LABEL_MAP[filters.craftType]
      ])
    }

    return normalized
  },

  matchOneField(rawValue, allowList = [], fuzzy = false) {
    if (!allowList || !allowList.length) return true
    const value = rawValue === undefined || rawValue === null ? '' : String(rawValue)
    if (allowList.indexOf(value) !== -1) return true
    if (!fuzzy) return false

    return allowList.some((candidate) => {
      const text = String(candidate || '')
      return (value && text && (value.indexOf(text) !== -1 || text.indexOf(value) !== -1))
    })
  },

  matchProductFilters(product, normalizedFilters = {}) {
    if (!product) return false
    const subCategoryRaw = product.subCategory
    const yearRaw = product.year
    const subCategoryCandidates = []
    const subCode = normalizeTeaSubCategoryCode(subCategoryRaw)
    if (subCode) {
      subCategoryCandidates.push(subCode)
      if (TEA_SUB_CATEGORY_LABEL_MAP[subCode]) subCategoryCandidates.push(TEA_SUB_CATEGORY_LABEL_MAP[subCode])
    }
    if (subCategoryRaw !== undefined && subCategoryRaw !== null) {
      subCategoryCandidates.push(String(subCategoryRaw))
    }

    const yearCandidates = []
    const yearId = normalizeYearId(yearRaw)
    if (yearId) {
      yearCandidates.push(yearId)
      if (YEAR_LABEL_MAP[yearId]) yearCandidates.push(YEAR_LABEL_MAP[yearId])
    }
    if (yearRaw !== undefined && yearRaw !== null) {
      yearCandidates.push(String(yearRaw))
    }

    return this.matchOneField(subCategoryCandidates.join('|'), normalizedFilters.subCategory, true) &&
      this.matchOneField(yearCandidates.join('|'), normalizedFilters.year, true) &&
      this.matchOneField(product.gardenType, normalizedFilters.gardenType) &&
      this.matchOneField(product.origin, normalizedFilters.origin, true) &&
      this.matchOneField(product.material, normalizedFilters.material, true) &&
      this.matchOneField(product.craftType, normalizedFilters.craftType, true)
  },

  async loadProductsFromDB(filters = {}, append = false) {
    const db = wx.cloud.database()
    const baseWhere = { category: this.data.currentCategory }
    const normalizedFilters = this.normalizeByCategoryFilters(filters)
    const skip = (this.data.page - 1) * this.data.pageSize

    // 直查分类下所有商品后在前端做兼容过滤，避免 id/中文值不一致导致空列表
    const all = []
    const batchSize = 100
    let offset = 0
    while (offset < 500) {
      const res = await db.collection('products')
        .where(baseWhere)
        .skip(offset)
        .limit(batchSize)
        .get()
      const rows = Array.isArray(res.data) ? res.data : []
      if (!rows.length) break
      all.push(...rows)
      if (rows.length < batchSize) break
      offset += batchSize
    }

    const filtered = all.filter((item) => this.matchProductFilters(item, normalizedFilters))
    const sorted = [...filtered].sort((a, b) => (b.sales || 0) - (a.sales || 0))
    const paged = sorted.slice(skip, skip + this.data.pageSize)

    const normalizedList = this.decorateProducts(paged)
    const products = append ? [...this.data.products, ...normalizedList] : normalizedList

    this.setData({
      products,
      hasMore: skip + normalizedList.length < sorted.length,
      loading: false,
      error: false,
      errorMessage: ''
    })

    return normalizedList.length
  },

  // 加载商品列表
  async loadProducts(append = false) {
    if (this.data.loading) return

    this.setData({ 
      loading: true,
      error: false
    })

    try {
      // 获取当前筛选条件
      const filters = this.getCurrentFilters()
      
      const result = await productApi.getProducts({
        category: this.data.currentCategory,
        page: this.data.page,
        pageSize: this.data.pageSize,
        ...filters // 添加筛选条件
      })

      const normalizedList = this.decorateProducts(result.list || [])

      // 云函数成功但返回空时，尝试数据库兼容过滤兜底（处理中英文字段不一致）
      if (!append && normalizedList.length === 0) {
        const count = await this.loadProductsFromDB(filters, append)
        if (count > 0) return
      }

      const products = append ? [...this.data.products, ...normalizedList] : normalizedList

      this.setData({
        products,
        hasMore: result.hasMore,
        loading: false
      })
    } catch (err) {
      console.warn('getProducts 云函数失败，回退数据库直查', err)

      try {
        const filters = this.getCurrentFilters()
        await this.loadProductsFromDB(filters, append)
        return
      } catch (dbErr) {
        console.error('数据库直查兜底也失败', dbErr)
      }

      // 使用错误处理模块
      const parsedError = handleError(err, {
        showMessage: false, // 不显示toast，使用页面内错误提示
        context: { 
          page: 'category', 
          category: this.data.currentCategory,
          append 
        }
      })

      this.setData({
        loading: false,
        error: true,
        errorMessage: parsedError.message
      })
    }
  },

  // 重试加载
  onRetry() {
    this.setData({
      page: 1,
      products: []
    })
    this.loadProducts()
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
  },

  // 计算会员价格
  getMemberPrice(price) {
    return formatPrice(calculateMemberPrice(price, this.data.memberLevel))
  }
})
