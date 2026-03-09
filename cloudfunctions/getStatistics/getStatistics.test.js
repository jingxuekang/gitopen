// 单元测试：getStatistics 云函数
const cloud = require('wx-server-sdk')

// Mock wx-server-sdk
jest.mock('wx-server-sdk', () => {
  const mockDb = {
    collection: jest.fn(),
    command: {
      gte: jest.fn((val) => ({ $gte: val })),
      lte: jest.fn((val) => ({ $lte: val })),
      and: jest.fn(function(val) { return { $and: [this, val] } }),
      inc: jest.fn((val) => ({ $inc: val }))
    },
    startTransaction: jest.fn()
  }

  return {
    init: jest.fn(),
    database: jest.fn(() => mockDb),
    getWXContext: jest.fn(),
    DYNAMIC_CURRENT_ENV: 'test'
  }
})

describe('getStatistics 云函数单元测试', () => {
  let db
  let mockCollection

  beforeEach(() => {
    jest.clearAllMocks()
    db = cloud.database()
    
    // 创建 mock collection
    mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    }
    
    db.collection.mockReturnValue(mockCollection)
  })

  describe('每日统计功能', () => {
    test('应该正确统计订单数量和销售额', async () => {
      // Mock 订单数据
      const mockOrders = [
        { payAmount: 10000, userId: 'user1' },
        { payAmount: 20000, userId: 'user2' },
        { payAmount: 15000, userId: 'user3' }
      ]

      mockCollection.get.mockResolvedValueOnce({ data: mockOrders })
      mockCollection.count.mockResolvedValueOnce({ total: 5 })

      const { main } = require('./index')
      const result = await main({
        type: 'daily',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-01T23:59:59.999Z'
      })

      expect(result.success).toBe(true)
      expect(result.data.orderCount).toBe(3)
      expect(result.data.totalSales).toBe(45000)
      expect(result.data.newUserCount).toBe(5)
    })

    test('应该处理空订单数据', async () => {
      mockCollection.get.mockResolvedValueOnce({ data: [] })
      mockCollection.count.mockResolvedValueOnce({ total: 0 })

      const { main } = require('./index')
      const result = await main({
        type: 'daily',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-01T23:59:59.999Z'
      })

      expect(result.success).toBe(true)
      expect(result.data.orderCount).toBe(0)
      expect(result.data.totalSales).toBe(0)
      expect(result.data.newUserCount).toBe(0)
    })

    test('应该使用默认日期范围（当天）', async () => {
      mockCollection.get.mockResolvedValueOnce({ data: [] })
      mockCollection.count.mockResolvedValueOnce({ total: 0 })

      const { main } = require('./index')
      const result = await main({ type: 'daily' })

      expect(result.success).toBe(true)
      expect(result.data.startDate).toBeDefined()
      expect(result.data.endDate).toBeDefined()
    })
  })

  describe('热销商品排行榜功能', () => {
    test('应该正确统计商品销售量并排序', async () => {
      const mockOrders = [
        {
          items: [
            { productId: 'p1', productName: '商品1', productImage: 'img1.jpg', quantity: 5, subtotal: 5000 },
            { productId: 'p2', productName: '商品2', productImage: 'img2.jpg', quantity: 3, subtotal: 3000 }
          ]
        },
        {
          items: [
            { productId: 'p1', productName: '商品1', productImage: 'img1.jpg', quantity: 10, subtotal: 10000 },
            { productId: 'p3', productName: '商品3', productImage: 'img3.jpg', quantity: 2, subtotal: 2000 }
          ]
        }
      ]

      mockCollection.get.mockResolvedValueOnce({ data: mockOrders })

      const { main } = require('./index')
      const result = await main({
        type: 'hotProducts',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z'
      })

      expect(result.success).toBe(true)
      expect(result.data.hotProducts).toHaveLength(3)
      
      // 验证排序：商品1应该排第一（销量15）
      expect(result.data.hotProducts[0].productId).toBe('p1')
      expect(result.data.hotProducts[0].salesCount).toBe(15)
      expect(result.data.hotProducts[0].salesAmount).toBe(15000)
      
      // 验证排序：商品2应该排第二（销量3）
      expect(result.data.hotProducts[1].productId).toBe('p2')
      expect(result.data.hotProducts[1].salesCount).toBe(3)
    })

    test('应该限制返回前20名商品', async () => {
      // 创建25个不同商品的订单
      const items = []
      for (let i = 1; i <= 25; i++) {
        items.push({
          productId: `p${i}`,
          productName: `商品${i}`,
          productImage: `img${i}.jpg`,
          quantity: 26 - i, // 销量递减
          subtotal: (26 - i) * 1000
        })
      }

      mockCollection.get.mockResolvedValueOnce({
        data: [{ items }]
      })

      const { main } = require('./index')
      const result = await main({
        type: 'hotProducts',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z'
      })

      expect(result.success).toBe(true)
      expect(result.data.hotProducts.length).toBeLessThanOrEqual(20)
    })

    test('应该处理空订单数据', async () => {
      mockCollection.get.mockResolvedValueOnce({ data: [] })

      const { main } = require('./index')
      const result = await main({
        type: 'hotProducts',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z'
      })

      expect(result.success).toBe(true)
      expect(result.data.hotProducts).toHaveLength(0)
    })
  })

  describe('用户地域分布统计功能', () => {
    test('应该正确统计省份和城市分布', async () => {
      const mockOrders = [
        {
          userId: 'user1',
          payAmount: 10000,
          address: { province: '浙江省', city: '杭州市' }
        },
        {
          userId: 'user2',
          payAmount: 20000,
          address: { province: '浙江省', city: '杭州市' }
        },
        {
          userId: 'user1',
          payAmount: 15000,
          address: { province: '浙江省', city: '宁波市' }
        },
        {
          userId: 'user3',
          payAmount: 30000,
          address: { province: '江苏省', city: '南京市' }
        }
      ]

      mockCollection.get.mockResolvedValueOnce({ data: mockOrders })

      const { main } = require('./index')
      const result = await main({ type: 'userRegion' })

      expect(result.success).toBe(true)
      
      // 验证省份统计
      expect(result.data.provinceStats).toBeDefined()
      const zjProvince = result.data.provinceStats.find(p => p.province === '浙江省')
      expect(zjProvince).toBeDefined()
      expect(zjProvince.orderCount).toBe(3)
      expect(zjProvince.userCount).toBe(2) // user1 和 user2
      expect(zjProvince.salesAmount).toBe(45000)

      // 验证城市统计
      expect(result.data.cityStats).toBeDefined()
      const hzCity = result.data.cityStats.find(c => c.city === '杭州市')
      expect(hzCity).toBeDefined()
      expect(hzCity.orderCount).toBe(2)
      expect(hzCity.userCount).toBe(2)
      expect(hzCity.salesAmount).toBe(30000)
    })

    test('应该按订单数量排序省份和城市', async () => {
      const mockOrders = [
        { userId: 'user1', payAmount: 10000, address: { province: '浙江省', city: '杭州市' } },
        { userId: 'user2', payAmount: 10000, address: { province: '浙江省', city: '杭州市' } },
        { userId: 'user3', payAmount: 10000, address: { province: '浙江省', city: '杭州市' } },
        { userId: 'user4', payAmount: 10000, address: { province: '江苏省', city: '南京市' } },
        { userId: 'user5', payAmount: 10000, address: { province: '江苏省', city: '南京市' } }
      ]

      mockCollection.get.mockResolvedValueOnce({ data: mockOrders })

      const { main } = require('./index')
      const result = await main({ type: 'userRegion' })

      expect(result.success).toBe(true)
      
      // 浙江省应该排第一（3个订单）
      expect(result.data.provinceStats[0].province).toBe('浙江省')
      expect(result.data.provinceStats[0].orderCount).toBe(3)
      
      // 江苏省应该排第二（2个订单）
      expect(result.data.provinceStats[1].province).toBe('江苏省')
      expect(result.data.provinceStats[1].orderCount).toBe(2)
    })

    test('应该处理缺少地址信息的订单', async () => {
      const mockOrders = [
        { userId: 'user1', payAmount: 10000, address: { province: '浙江省', city: '杭州市' } },
        { userId: 'user2', payAmount: 20000, address: null },
        { userId: 'user3', payAmount: 15000 }
      ]

      mockCollection.get.mockResolvedValueOnce({ data: mockOrders })

      const { main } = require('./index')
      const result = await main({ type: 'userRegion' })

      expect(result.success).toBe(true)
      expect(result.data.provinceStats).toHaveLength(1)
      expect(result.data.provinceStats[0].province).toBe('浙江省')
    })

    test('应该限制城市统计返回前50个', async () => {
      // 创建60个不同城市的订单
      const mockOrders = []
      for (let i = 1; i <= 60; i++) {
        mockOrders.push({
          userId: `user${i}`,
          payAmount: 10000,
          address: { province: '省份', city: `城市${i}` }
        })
      }

      mockCollection.get.mockResolvedValueOnce({ data: mockOrders })

      const { main } = require('./index')
      const result = await main({ type: 'userRegion' })

      expect(result.success).toBe(true)
      expect(result.data.cityStats.length).toBeLessThanOrEqual(50)
    })
  })

  describe('错误处理', () => {
    test('应该处理无效的统计类型', async () => {
      const { main } = require('./index')
      const result = await main({ type: 'invalid' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('无效的统计类型')
    })

    test('应该处理数据库查询错误', async () => {
      mockCollection.get.mockRejectedValueOnce(new Error('数据库错误'))

      const { main } = require('./index')
      const result = await main({
        type: 'daily',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-01T23:59:59.999Z'
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('获取统计数据失败')
      expect(result.error).toBe('数据库错误')
    })
  })

  describe('综合统计功能', () => {
    test('应该返回完整的综合统计数据', async () => {
      // Mock 各种数据
      mockCollection.get
        .mockResolvedValueOnce({ data: [{ payAmount: 10000 }] }) // daily orders
        .mockResolvedValueOnce({ data: [{ items: [{ productId: 'p1', productName: '商品1', productImage: 'img1.jpg', quantity: 5, subtotal: 5000 }] }] }) // hot products
        .mockResolvedValueOnce({ data: [{ userId: 'user1', payAmount: 10000, address: { province: '浙江省', city: '杭州市' } }] }) // region

      mockCollection.count
        .mockResolvedValueOnce({ total: 5 }) // new users
        .mockResolvedValueOnce({ total: 100 }) // total users
        .mockResolvedValueOnce({ total: 50 }) // total products
        .mockResolvedValueOnce({ total: 200 }) // total orders

      const { main } = require('./index')
      const result = await main({
        type: 'overview',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z'
      })

      expect(result.success).toBe(true)
      expect(result.data.daily).toBeDefined()
      expect(result.data.hotProducts).toBeDefined()
      expect(result.data.region).toBeDefined()
      expect(result.data.totals).toBeDefined()
      expect(result.data.totals.totalUsers).toBe(100)
      expect(result.data.totals.totalProducts).toBe(50)
      expect(result.data.totals.totalOrders).toBe(200)
    })
  })
})

describe('商品统计功能边界测试', () => {
  test('应该处理商品浏览记录表不存在的情况', async () => {
    const db = cloud.database()
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    }
    
    db.collection.mockReturnValue(mockCollection)

    // Mock products
    mockCollection.get
      .mockResolvedValueOnce({ 
        data: [{ 
          _id: 'p1', 
          name: '商品1', 
          images: ['img1.jpg'],
          skus: [{ stock: 100 }],
          sales: 50,
          status: 1
        }] 
      })
      .mockResolvedValueOnce({ data: [] }) // orders for sales

    // Mock count for views (table not exists)
    mockCollection.count.mockRejectedValueOnce(new Error('Collection not found'))
    // Mock count for cart
    mockCollection.count.mockResolvedValueOnce({ total: 10 })

    const { main } = require('./index')
    const result = await main({
      type: 'product',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z'
    })

    expect(result.success).toBe(true)
    expect(result.data.products[0].viewCount).toBe(0) // 应该返回0而不是报错
  })
})
