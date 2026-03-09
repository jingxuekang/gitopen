/**
 * 模拟数据 - 用于测试环境（不使用云服务）
 */

// 模拟商品数据
const mockProducts = [
  {
    _id: '1',
    name: '福鼎白茶 白毫银针',
    category: 'tea',
    subCategory: '银针',
    year: '五年',
    price: 298,
    originalPrice: 398,
    image: '/images/products/tea1.jpg',
    images: ['/images/products/tea1.jpg'],
    sales: 1580,
    rating: 4.9,
    stock: 100,
    description: '福鼎白茶，五年陈化，香气浓郁'
  },
  {
    _id: '2',
    name: '福鼎白茶 白牡丹',
    category: 'tea',
    subCategory: '牡丹',
    year: '三年',
    price: 188,
    originalPrice: 258,
    image: '/images/products/tea2.jpg',
    images: ['/images/products/tea2.jpg'],
    sales: 2340,
    rating: 4.8,
    stock: 150,
    description: '福鼎白茶，三年陈化，口感醇厚'
  },
  {
    _id: '3',
    name: '新会陈皮 天马产区',
    category: 'chenpi',
    subCategory: '天马',
    year: '十年',
    price: 468,
    originalPrice: 588,
    image: '/images/products/chenpi1.jpg',
    images: ['/images/products/chenpi1.jpg'],
    sales: 980,
    rating: 4.9,
    stock: 80,
    description: '新会陈皮，天马产区，十年陈化'
  },
  {
    _id: '4',
    name: '紫砂壶 子冶石瓢',
    category: 'teapot',
    subCategory: '子冶石瓢',
    material: '紫泥',
    craftType: '全手工',
    price: 1280,
    originalPrice: 1680,
    image: '/images/products/teapot1.jpg',
    images: ['/images/products/teapot1.jpg'],
    sales: 456,
    rating: 5.0,
    stock: 20,
    description: '紫砂壶，子冶石瓢，全手工制作'
  },
  {
    _id: '5',
    name: '福鼎白茶 寿眉',
    category: 'tea',
    subCategory: '寿眉',
    year: '一年',
    price: 128,
    originalPrice: 168,
    image: '/images/products/tea3.jpg',
    images: ['/images/products/tea3.jpg'],
    sales: 3200,
    rating: 4.7,
    stock: 200,
    description: '福鼎白茶，一年新茶，清香怡人'
  }
]

// 模拟轮播图数据
const mockBanners = [
  { id: 1, image: '/images/banner/banner1.jpg', link: '' },
  { id: 2, image: '/images/banner/banner2.jpg', link: '' },
  { id: 3, image: '/images/banner/banner3.jpg', link: '' }
]

// 模拟拼团活动
const mockGroupActivities = [
  {
    _id: 'g1',
    productId: '1',
    productName: '福鼎白茶 白毫银针',
    productImage: '/images/products/tea1.jpg',
    originalPrice: 298,
    groupPrice: 258,
    minPeople: 3,
    currentGroups: 5,
    endTime: Date.now() + 86400000 * 3
  }
]

/**
 * 模拟 API 响应
 */
const mockApi = {
  // 获取首页数据
  getHomeData: () => {
    return Promise.resolve({
      banners: mockBanners,
      hotProducts: mockProducts.slice(0, 4),
      newProducts: mockProducts.slice(0, 3),
      groupActivities: mockGroupActivities
    })
  },

  // 获取商品列表
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

    // 分类筛选
    if (category) {
      products = products.filter(p => p.category === category)
    }

    // 子分类筛选
    if (filters.subCategory) {
      products = products.filter(p => p.subCategory === filters.subCategory)
    }

    // 年份筛选
    if (filters.year) {
      products = products.filter(p => p.year === filters.year)
    }

    // 泥料筛选
    if (filters.material) {
      products = products.filter(p => p.material === filters.material)
    }

    // 成型方式筛选
    if (filters.craftType) {
      products = products.filter(p => p.craftType === filters.craftType)
    }

    // 产区筛选
    if (filters.origin) {
      products = products.filter(p => p.subCategory === filters.origin)
    }

    // 排序
    products.sort((a, b) => {
      const aVal = a[orderBy] || 0
      const bVal = b[orderBy] || 0
      return orderDirection === 'desc' ? bVal - aVal : aVal - bVal
    })

    // 分页
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

  // 获取商品详情
  getProductDetail: (productId) => {
    const product = mockProducts.find(p => p._id === productId)
    return Promise.resolve(product || null)
  },

  // 搜索商品
  searchProducts: (keyword) => {
    const products = mockProducts.filter(p => 
      p.name.includes(keyword) || p.description.includes(keyword)
    )
    return Promise.resolve({
      list: products,
      total: products.length
    })
  },

  // 获取用户资料
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

  // 获取购物车
  getCart: () => {
    return Promise.resolve({
      items: [],
      total: 0
    })
  },

  // 获取地址列表
  getAddresses: () => {
    return Promise.resolve([])
  },

  // 获取订单列表
  getOrders: (status) => {
    return Promise.resolve({
      list: [],
      total: 0
    })
  },

  // 获取收藏列表
  getFavorites: () => {
    return Promise.resolve([])
  },

  // 获取优惠券列表
  getCoupons: () => {
    return Promise.resolve([])
  },

  // 获取拼团活动列表
  getGroupActivities: () => {
    return Promise.resolve(mockGroupActivities)
  }
}

module.exports = {
  mockApi,
  mockProducts,
  mockBanners,
  mockGroupActivities
}
