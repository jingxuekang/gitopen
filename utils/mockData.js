/**
 * 模拟数据 - 用于测试环境（不使用云服务）
 */

const teaImage = '/images/category/tea.png'
const chenpiImage = '/images/category/chenpi.png'
const teapotImage = '/images/category/teapot.png'

// 模拟商品数据
const mockProducts = [
  {
    _id: '1',
    name: '福鼎白茶 白毫银针',
    category: 'tea',
    subCategory: 'yinzhen',
    gardenType: 'base',
    year: '五年',
    price: 29800,
    originalPrice: 39800,
    image: teaImage,
    images: [teaImage],
    sales: 1580,
    rating: 4.9,
    stock: 100,
    description: '福鼎白茶，五年陈化，香气浓郁',
    origin: '福建福鼎',
    skus: [
      {
        skuCode: '1-50g',
        specValues: ['50g'],
        price: 29800,
        stock: 20
      },
      {
        skuCode: '1-100g',
        specValues: ['100g'],
        price: 56800,
        stock: 12
      }
    ]
  },
  {
    _id: '2',
    name: '福鼎白茶 白牡丹',
    category: 'tea',
    subCategory: 'mudan',
    gardenType: 'garden',
    year: '三年',
    price: 18800,
    originalPrice: 25800,
    image: teaImage,
    images: [teaImage],
    sales: 2340,
    rating: 4.8,
    stock: 150,
    description: '福鼎白茶，三年陈化，口感醇厚',
    origin: '福建福鼎'
  },
  {
    _id: '3',
    name: '新会陈皮 天马产区',
    category: 'chenpi',
    subCategory: 'tianma',
    year: '十年',
    price: 46800,
    originalPrice: 58800,
    image: chenpiImage,
    images: [chenpiImage],
    sales: 980,
    rating: 4.9,
    stock: 80,
    description: '新会陈皮，天马产区，十年陈化',
    origin: '广东新会'
  },
  {
    _id: '4',
    name: '紫砂壶 子冶石瓢',
    category: 'teapot',
    subCategory: 'ziyeshipiao',
    material: '紫泥',
    craftType: '全手工',
    price: 128000,
    originalPrice: 168000,
    image: teapotImage,
    images: [teapotImage],
    sales: 456,
    rating: 5.0,
    stock: 20,
    description: '紫砂壶，子冶石瓢，全手工制作',
    origin: '江苏宜兴'
  },
  {
    _id: '5',
    name: '福鼎白茶 寿眉',
    category: 'tea',
    subCategory: 'shoumei',
    gardenType: 'wild',
    year: '一年',
    price: 12800,
    originalPrice: 16800,
    image: teaImage,
    images: [teaImage],
    sales: 3200,
    rating: 4.7,
    stock: 200,
    description: '福鼎白茶，一年新茶，清香怡人',
    origin: '福建福鼎'
  },
  {
    _id: '6',
    name: '福鼎白茶 贡眉',
    category: 'tea',
    subCategory: 'gongmei',
    gardenType: 'base',
    year: '三年',
    price: 16800,
    originalPrice: 22800,
    image: teaImage,
    images: [teaImage],
    sales: 1960,
    rating: 4.8,
    stock: 120,
    description: '贡眉陈香明显，汤感醇和耐泡',
    origin: '福建福鼎'
  }
]

// 模拟轮播图数据
const mockBanners = [
  { id: 1, image: teaImage, link: '' },
  { id: 2, image: chenpiImage, link: '' },
  { id: 3, image: teapotImage, link: '' }
]

// 模拟拼团活动
const mockGroupActivities = [
  {
    _id: 'g1',
    productId: '1',
    productName: '福鼎白茶 白毫银针',
    productImage: teaImage,
    originalPrice: 29800,
    groupPrice: 25800,
    minPeople: 3,
    currentGroups: 5,
    endTime: Date.now() + 86400000 * 3
  }
]

let mockFavorites = []
let mockCart = []

const resolveProductId = (payload) => {
  if (typeof payload === 'string') return payload
  if (payload && payload.productId) return payload.productId
  return ''
}

/**
 * 模拟 API 响应
 */
const mockApi = {
  getHomeData: () => {
    return Promise.resolve({
      banners: mockBanners,
      hotProducts: mockProducts.slice(0, 4),
      newProducts: mockProducts.slice(0, 3),
      groupActivities: mockGroupActivities
    })
  },

  getProducts: (params = {}) => {
    const {
      category,
      page = 1,
      pageSize = 10,
      orderBy = 'sales',
      orderDirection = 'desc',
      filters = {}
    } = params

    let products = [...mockProducts]

    if (category) {
      products = products.filter((p) => p.category === category)
    }
    if (filters.subCategory) {
      products = products.filter((p) => p.subCategory === filters.subCategory)
    }
    if (filters.year) {
      products = products.filter((p) => p.year === filters.year)
    }
    if (filters.garden) {
      products = products.filter((p) => p.gardenType === filters.garden)
    }
    if (filters.material) {
      products = products.filter((p) => p.material === filters.material)
    }
    if (filters.craftType) {
      products = products.filter((p) => p.craftType === filters.craftType)
    }

    products.sort((a, b) => {
      const aVal = a[orderBy] || 0
      const bVal = b[orderBy] || 0
      return orderDirection === 'desc' ? bVal - aVal : aVal - bVal
    })

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = products.slice(start, end)

    return Promise.resolve({
      list,
      total: products.length,
      page,
      pageSize,
      hasMore: end < products.length
    })
  },

  getProductDetail: (payload = {}) => {
    const productId = resolveProductId(payload)
    const product = mockProducts.find((p) => p._id === productId)

    if (!product) {
      return Promise.reject({ code: 404, message: '商品不存在' })
    }

    return Promise.resolve({
      product,
      reviews: []
    })
  },

  searchProducts: ({ keyword = '' } = {}) => {
    const products = mockProducts.filter((p) => {
      return p.name.includes(keyword) || p.description.includes(keyword)
    })
    return Promise.resolve({
      list: products,
      total: products.length
    })
  },

  getUserProfile: () => {
    return Promise.resolve({
      success: true,
      data: {
        memberLevel: 0,
        nickname: '测试用户',
        avatar: '/images/default-avatar.png'
      }
    })
  },

  getCart: () => {
    const total = mockCart.reduce((sum, item) => sum + item.quantity * item.price, 0)
    return Promise.resolve({
      items: mockCart,
      total
    })
  },

  addToCart: ({ productId, skuCode = null, quantity = 1 } = {}) => {
    const product = mockProducts.find((p) => p._id === productId)
    if (!product) {
      return Promise.reject({ code: 404, message: '商品不存在' })
    }

    const price = skuCode
      ? ((product.skus || []).find((item) => item.skuCode === skuCode) || {}).price || product.price
      : product.price

    const key = `${productId}-${skuCode || 'default'}`
    const existing = mockCart.find((item) => item.key === key)
    if (existing) {
      existing.quantity += quantity
    } else {
      mockCart.push({
        key,
        productId,
        skuCode,
        quantity,
        price,
        name: product.name,
        image: product.image
      })
    }

    return Promise.resolve({ success: true })
  },

  getAddresses: () => Promise.resolve([]),

  getOrders: () => {
    return Promise.resolve({
      list: [],
      total: 0
    })
  },

  getFavorites: () => Promise.resolve(mockFavorites),

  addFavorite: (payload = {}) => {
    const productId = resolveProductId(payload)
    if (!productId) return Promise.resolve({ success: true })

    if (!mockFavorites.some((item) => item.productId === productId)) {
      mockFavorites.push({ productId })
    }
    return Promise.resolve({ success: true })
  },

  removeFavorite: (payload = {}) => {
    const productId = resolveProductId(payload)
    mockFavorites = mockFavorites.filter((item) => item.productId !== productId)
    return Promise.resolve({ success: true })
  },

  getCoupons: () => Promise.resolve([]),

  getGroupActivities: () => Promise.resolve(mockGroupActivities)
}

module.exports = {
  mockApi,
  mockProducts,
  mockBanners,
  mockGroupActivities
}
