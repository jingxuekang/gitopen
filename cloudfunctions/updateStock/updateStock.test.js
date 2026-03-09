// 云函数 updateStock 单元测试
const cloud = require('wx-server-sdk')

// Mock wx-server-sdk
jest.mock('wx-server-sdk', () => ({
  init: jest.fn(),
  database: jest.fn(() => ({
    collection: jest.fn()
  })),
  DYNAMIC_CURRENT_ENV: 'test-env',
  getWXContext: jest.fn(() => ({
    OPENID: 'test-openid'
  }))
}))

// 导入云函数
const updateStock = require('./index')

describe('updateStock 云函数测试', () => {
  let mockDb
  let mockCollection

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks()

    // 设置数据库 mock
    mockCollection = {
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn()
      }))
    }

    mockDb = {
      collection: jest.fn(() => mockCollection)
    }

    cloud.database.mockReturnValue(mockDb)
  })

  describe('参数验证', () => {
    test('缺少 productId 应该返回错误', async () => {
      const event = {
        skuCode: 'sku_001',
        stock: 50
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(false)
      expect(result.message).toBe('商品ID不能为空')
    })

    test('商品不存在应该返回错误', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: null
      })

      const event = {
        productId: 'invalid_id',
        skuCode: 'sku_001',
        stock: 50
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(false)
      expect(result.message).toBe('商品不存在')
    })

    test('SKU不存在应该返回错误', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 100 }
          ]
        }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'invalid_sku',
        stock: 50
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(false)
      expect(result.message).toBe('SKU不存在')
    })

    test('set操作库存为负数应该返回错误', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 100 }
          ]
        }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: -10,
        operation: 'set'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(false)
      expect(result.message).toBe('库存数量必须是非负整数')
    })
  })

  describe('set 操作', () => {
    test('应该正确设置SKU库存', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 100, specValues: ['250g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 50,
        operation: 'set'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.oldStock).toBe(100)
      expect(result.data.newStock).toBe(50)
      expect(mockCollection.doc().update).toHaveBeenCalled()
    })

    test('设置库存为0应该返回缺货预警', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 100, specValues: ['250g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 0,
        operation: 'set'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.warnings).toHaveLength(1)
      expect(result.data.warnings[0].type).toBe('out_of_stock')
    })

    test('设置库存≤10应该返回库存不足预警', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 100, specValues: ['250g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 8,
        operation: 'set'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.warnings).toHaveLength(1)
      expect(result.data.warnings[0].type).toBe('low_stock')
      expect(result.data.warnings[0].stock).toBe(8)
    })
  })

  describe('increase 操作', () => {
    test('应该正确增加SKU库存', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 50, specValues: ['250g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 30,
        operation: 'increase'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.oldStock).toBe(50)
      expect(result.data.newStock).toBe(80)
    })

    test('增加数量≤0应该返回错误', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 50, specValues: ['250g'] }
          ]
        }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 0,
        operation: 'increase'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(false)
      expect(result.message).toBe('增加数量必须是正整数')
    })
  })

  describe('decrease 操作', () => {
    test('应该正确减少SKU库存', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 50, specValues: ['250g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 20,
        operation: 'decrease'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.oldStock).toBe(50)
      expect(result.data.newStock).toBe(30)
    })

    test('减少后库存不应该为负数', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 10, specValues: ['250g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        skuCode: 'sku_001',
        stock: 20,
        operation: 'decrease'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.newStock).toBe(0)
      expect(result.data.newStock).toBeGreaterThanOrEqual(0)
    })
  })

  describe('批量更新', () => {
    test('应该平均分配库存到所有SKU', async () => {
      mockCollection.doc().get.mockResolvedValue({
        data: {
          _id: 'product_001',
          name: '测试商品',
          skus: [
            { skuCode: 'sku_001', stock: 10, specValues: ['250g'] },
            { skuCode: 'sku_002', stock: 20, specValues: ['500g'] },
            { skuCode: 'sku_003', stock: 30, specValues: ['1000g'] }
          ]
        }
      })

      mockCollection.doc().update.mockResolvedValue({
        stats: { updated: 1 }
      })

      const event = {
        productId: 'product_001',
        stock: 100,
        operation: 'set'
      }

      const result = await updateStock.main(event, {})

      expect(result.success).toBe(true)
      expect(result.data.totalStock).toBe(100)
      expect(result.data.skuCount).toBe(3)
      
      // 验证update调用
      const updateCall = mockCollection.doc().update.mock.calls[0][0]
      const updateData = updateCall.data
      
      // 100 / 3 = 33余1，所以第一个SKU应该是34，其他是33
      expect(updateData['skus.0.stock']).toBe(34)
      expect(updateData['skus.1.stock']).toBe(33)
      expect(updateData['skus.2.stock']).toBe(33)
    })
  })
})
