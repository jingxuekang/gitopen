// pages/index/index.js
const { formatPrice, calculateMemberPrice } = require('../../utils/util.js')

const DEFAULT_BANNERS = [
  { _id: 'fallback-1', image: '/images/category/tea.png' },
  { _id: 'fallback-2', image: '/images/category/chenpi.png' },
  { _id: 'fallback-3', image: '/images/category/teapot.png' }
]

const DEFAULT_CATEGORIES = [
  { id: 'tea', name: '茶叶', icon: '/images/category/tea.png' },
  { id: 'chenpi', name: '陈皮', icon: '/images/category/chenpi.png' },
  { id: 'teapot', name: '紫砂壶', icon: '/images/category/teapot.png' }
]

function normalizeCategoryId(input = '', name = '') {
  const raw = String(input || '').trim().toLowerCase()
  if (raw === 'tea' || raw === 'chaye') return 'tea'
  if (raw === 'chenpi') return 'chenpi'
  if (raw === 'teapot' || raw === 'zishahu' || raw === 'zisha') return 'teapot'

  const title = String(name || '')
  if (title.indexOf('茶') !== -1) return 'tea'
  if (title.indexOf('陈皮') !== -1) return 'chenpi'
  if (title.indexOf('紫砂') !== -1) return 'teapot'
  return ''
}

Page({
  data: {
    loading: true,
    memberLevel: 0,
    banners: [],
    categories: DEFAULT_CATEGORIES,
    rankTabs: [
      { id: 'sales', name: '销量榜' },
      { id: 'rating', name: '口碑榜' },
      { id: 'price', name: '超值榜' }
    ],
    currentRankTab: 'sales',
    rankingSource: [],
    rankingList: [],
    groupActivities: [],
    newProducts: []
  },

  onLoad() {
    this.bootstrap()
  },

  onShow() {
    this.loadUserProfile()
  },

  onPullDownRefresh() {
    this.bootstrap().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async bootstrap() {
    this.setData({ loading: true })
    await Promise.all([
      this.loadUserProfile().catch(() => {}),
      this.loadHomeData().catch(() => {})
    ])
    this.setData({ loading: false })
  },

  async loadUserProfile() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getUserProfile' })
      if (res && res.result && res.result.success) {
        this.setData({
          memberLevel: res.result.data.memberLevel || 0
        })
      }
    } catch (err) {
      console.error('加载用户信息失败', err)
    }
  },

  async loadBannersFromDB() {
    const db = wx.cloud.database()
    const collectionCandidates = ['banners', 'banner']
    let rows = []
    const errors = []

    for (const name of collectionCandidates) {
      try {
        const res = await db.collection(name).orderBy('sort', 'asc').get()
        const list = Array.isArray(res.data) ? res.data : []
        if (list.length) {
          rows = list
          console.info('[首页轮播] 命中集合:', name, '记录数:', list.length)
          break
        }
      } catch (err) {
        // 集合不存在或无权限，继续尝试下一个候选集合
        errors.push({ collection: name, errMsg: err && (err.errMsg || err.message) })
      }
    }

    if (!rows.length && errors.length) {
      console.warn('[首页轮播] 查询集合失败，可能是权限问题:', errors)
    }

    const banners = rows
      .map((item) => {
        if (!item) return null
        const image = item.image || item.fileID || item.fileId || item.url || item.src || ''
        if (!image) return null
        return {
          _id: item._id || image,
          image,
          sort: Number(item.sort || 0),
          link: item.link || item.path || ''
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.sort - b.sort)

    console.info('[首页轮播] 可用轮播数:', banners.length)

    return this.resolveBannerImages(banners)
  },

  async loadCategoriesFromDB() {
    const db = wx.cloud.database()
    let rows = []
    try {
      const res = await db.collection('categories').orderBy('sort', 'asc').get()
      rows = Array.isArray(res.data) ? res.data : []
    } catch (err) {
      console.warn('[首页分类] 读取 categories 集合失败，使用默认分类', err)
      return DEFAULT_CATEGORIES
    }

    if (!rows.length) {
      return DEFAULT_CATEGORIES
    }

    const mapped = rows
      .map((item) => {
        if (!item) return null
        const id = normalizeCategoryId(
          item.id || item.code || item.categoryId || item.category || item.key,
          item.name
        )
        if (!id) return null
        return {
          id,
          name: item.name || '',
          icon: item.homeIcon || item.icon || item.image || item.fileID || item.fileId || item.url || item.src || ''
        }
      })
      .filter(Boolean)

    if (!mapped.length) {
      return DEFAULT_CATEGORIES
    }

    const resolved = await this.resolveImageField(mapped, 'icon')
    const byId = {}
    resolved.forEach((item) => {
      if (item && item.id) byId[item.id] = item
    })

    const categories = DEFAULT_CATEGORIES.map((def) => {
      const remote = byId[def.id]
      if (!remote) return def
      return {
        ...def,
        name: remote.name || def.name,
        icon: remote.icon || def.icon
      }
    })

    console.info('[首页分类] 可用分类数:', categories.length)
    return categories
  },

  async resolveImageField(input = [], field = 'image') {
    const list = Array.isArray(input) ? input : []
    const cloudFileList = list
      .map((item) => item && item[field])
      .filter((src) => typeof src === 'string' && src.indexOf('cloud://') === 0)

    if (!cloudFileList.length) {
      return list.filter(Boolean)
    }

    let tempRes = { fileList: [] }
    try {
      tempRes = await wx.cloud.getTempFileURL({ fileList: cloudFileList })
    } catch (err) {
      console.error(`cloud ${field} 转临时链接失败`, err)
    }

    const urlMap = {}
    ;(tempRes.fileList || []).forEach((item) => {
      if (item.fileID && item.tempFileURL) {
        urlMap[item.fileID] = item.tempFileURL
      }
    })

    return list
      .map((item) => {
        const src = item && item[field]
        if (!src) return null
        if (typeof src === 'string' && src.indexOf('cloud://') === 0) {
          const tempUrl = urlMap[src]
          // 临时链接不可用时，回退使用原始 fileID，避免配置项被整体过滤掉
          return tempUrl ? { ...item, [field]: tempUrl } : item
        }
        return item
      })
      .filter(Boolean)
  },

  async resolveBannerImages(input = []) {
    const list = await this.resolveImageField(input, 'image')
    return list.filter((item) => item && item.image)
  },

  normalizeProducts(list = []) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const images = Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [item.image || '/images/category/tea.png']
      return { ...item, images }
    })
  },

  normalizeGroupActivities(list = []) {
    return (Array.isArray(list) ? list : []).map((item) => {
      if (item.product) {
        return {
          ...item,
          product: {
            ...item.product,
            images: Array.isArray(item.product.images) && item.product.images.length > 0
              ? item.product.images
              : [item.product.image || '/images/category/tea.png']
          },
          requiredCount: item.requiredCount || item.minPeople || 2
        }
      }

      return {
        ...item,
        requiredCount: item.requiredCount || item.minPeople || 2,
        product: {
          _id: item.productId || '',
          name: item.productName || '拼团商品',
          images: [item.productImage || '/images/category/tea.png']
        }
      }
    })
  },

  async loadHomeData() {
    let dbBanners = []
    let dbCategories = DEFAULT_CATEGORIES
    let homeData = {}

    try {
      dbBanners = await this.loadBannersFromDB()
    } catch (err) {
      console.error('读取 banners 集合失败', err)
    }
    dbCategories = await this.loadCategoriesFromDB()

    // 只配置 banners 时，跳过 getHomeData，避免其它集合未配置导致 500
    if (!dbBanners.length) {
      try {
        const res = await wx.cloud.callFunction({ name: 'getHomeData' })
        if (res && res.result) {
          if (res.result.code === 0 && res.result.data) {
            homeData = res.result.data
          } else if (res.result.data) {
            homeData = res.result.data
          }
        }
      } catch (err) {
        homeData = {}
      }
    }

    const apiBannersRaw = Array.isArray(homeData.banners) ? homeData.banners : []
    const apiBanners = await this.resolveBannerImages(apiBannersRaw)
    const hotProducts = this.normalizeProducts(homeData.hotProducts || [])
    const newProducts = this.normalizeProducts(homeData.newProducts || [])
    const groupActivities = this.normalizeGroupActivities(homeData.groupActivities || [])

    const banners = dbBanners.length
      ? dbBanners
      : (apiBanners.length ? apiBanners : DEFAULT_BANNERS)

    const rankingSource = hotProducts.length ? hotProducts : newProducts

    this.setData({
      banners,
      categories: dbCategories,
      newProducts,
      groupActivities,
      rankingSource
    })

    this.updateRankingList(this.data.currentRankTab, rankingSource)
  },

  updateRankingList(tabId, source = []) {
    const list = [...source]
    if (tabId === 'price') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (tabId === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else {
      list.sort((a, b) => (b.sales || 0) - (a.sales || 0))
    }

    this.setData({
      rankingList: list.slice(0, 6)
    })
  },

  switchRankTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.currentRankTab) return

    this.setData({ currentRankTab: tab })
    this.updateRankingList(tab, this.data.rankingSource)
  },

  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goToCategory(e) {
    const category = e.currentTarget.dataset.category || 'tea'
    wx.navigateTo({
      url: `/pages/category/category?category=${category}`
    })
  },

  goToProduct(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/product/product?id=${id}`
    })
  },

  goToGroupList() {
    wx.navigateTo({
      url: '/pages/group/list/list'
    })
  },

  goToGroup(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/group/detail/detail?id=${id}`
    })
  },

  getRankIcon(index) {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return index + 1
  },

  formatPrice(price) {
    return formatPrice(price || 0)
  },

  getMemberPrice(price) {
    return formatPrice(calculateMemberPrice(price || 0, this.data.memberLevel))
  }
})
