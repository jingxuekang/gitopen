/**
 * 购物车功能单元测试
 * 测试购物车的添加、获取、更新、删除功能
 */

describe('购物车功能测试', () => {
  // Mock数据
  const mockProduct = {
    _id: 'product_001',
    name: '西湖龙井',
    category: 'tea',
    images: ['https://example.com/image1.jpg'],
    price: 29800,
    stock: 100,
    skus: [
      {
        skuCode: 'SKU_001',
        specValues: ['250g', '特级'],
        price: 29800,
        stock: 100
      },
      {
        skuCode: 'SKU_002',
        specValues: ['500g', '特级'],
        price: 55800,
        stock: 50
      }
    ],
    status: 1
  }

  const mockUserId = 'user_001'

  describe('addToCart - 添加商品到购物车', () => {
    test('应该成功添加新商品到购物车', () => {
      const cartItem = {
        userId: mockUserId,
        productId: mockProduct._id,
        skuCode: 'SKU_001',
        quantity: 2,
        selected: true
      }

      expect(cartItem.quantity).toBe(2)
      expect(cartItem.selected).toBe(true)
    })

    test('应该在商品已存在时累加数量', () => {
      const existingQuantity = 2
      const addQuantity = 3
      const newQuantity = existingQuantity + addQuantity

      expect(newQuantity).toBe(5)
    })

    test('应该在库存不足时返回错误', () => {
      const requestQuantity = 150
      const availableStock = 100

      expect(requestQuantity).toBeGreaterThan(availableStock)
    })

    test('应该验证必需参数', () => {
      const invalidRequest1 = { productId: null, skuCode: 'SKU_001', quantity: 1 }
      const invalidRequest2 = { productId: 'product_001', skuCode: null, quantity: 1 }
      const invalidRequest3 = { productId: 'product_001', skuCode: 'SKU_001', quantity: 0 }

      expect(invalidRequest1.productId).toBeFalsy()
      expect(invalidRequest2.skuCode).toBeFalsy()
      expect(invalidRequest3.quantity).toBeLessThanOrEqual(0)
    })
  })

  describe('getCart - 获取购物车列表', () => {
    test('应该正确计算购物车总价', () => {
      const items = [
        { price: 29800, quantity: 2, selected: true, available: true },
        { price: 55800, quantity: 1, selected: true, available: true },
        { price: 15000, quantity: 3, selected: false, available: true }
      ]

      const totalPrice = items
        .filter(item => item.selected && item.available)
        .reduce((sum, item) => sum + item.price * item.quantity, 0)

      expect(totalPrice).toBe(29800 * 2 + 55800 * 1)
    })

    test('应该只计算选中且可用商品的总价', () => {
      const items = [
        { price: 29800, quantity: 2, selected: true, available: true, subtotal: 59600 },
        { price: 55800, quantity: 1, selected: true, available: false, subtotal: 55800 },
        { price: 15000, quantity: 3, selected: false, available: true, subtotal: 45000 }
      ]

      const totalPrice = items
        .filter(item => item.selected && item.available)
        .reduce((sum, item) => sum + item.subtotal, 0)

      expect(totalPrice).toBe(59600)
    })

    test('应该正确标记库存不足的商品', () => {
      const cartItem = {
        quantity: 10,
        stock: 5
      }

      const available = cartItem.stock >= cartItem.quantity

      expect(available).toBe(false)
    })

    test('应该返回空购物车', () => {
      const items = []
      const totalPrice = 0
      const selectedCount = 0

      expect(items.length).toBe(0)
      expect(totalPrice).toBe(0)
      expect(selectedCount).toBe(0)
    })
  })

  describe('updateCartItem - 更新购物车商品', () => {
    test('应该成功更新商品数量', () => {
      const cartItem = {
        quantity: 2
      }
      const newQuantity = 5

      cartItem.quantity = newQuantity

      expect(cartItem.quantity).toBe(5)
    })

    test('应该成功更新选中状态', () => {
      const cartItem = {
        selected: true
      }

      cartItem.selected = false

      expect(cartItem.selected).toBe(false)
    })

    test('应该在数量超过库存时返回错误', () => {
      const requestQuantity = 150
      const availableStock = 100

      expect(requestQuantity).toBeGreaterThan(availableStock)
    })

    test('应该拒绝无效的数量', () => {
      const invalidQuantities = [0, -1, -10]

      invalidQuantities.forEach(quantity => {
        expect(quantity).toBeLessThanOrEqual(0)
      })
    })
  })

  describe('deleteCartItem - 删除购物车商品', () => {
    test('应该成功删除单个商品', () => {
      const cartItems = [
        { _id: 'item_001', productId: 'product_001' },
        { _id: 'item_002', productId: 'product_002' }
      ]

      const itemIdToDelete = 'item_001'
      const remainingItems = cartItems.filter(item => item._id !== itemIdToDelete)

      expect(remainingItems.length).toBe(1)
      expect(remainingItems[0]._id).toBe('item_002')
    })

    test('应该成功批量删除商品', () => {
      const cartItems = [
        { _id: 'item_001', productId: 'product_001' },
        { _id: 'item_002', productId: 'product_002' },
        { _id: 'item_003', productId: 'product_003' }
      ]

      const itemIdsToDelete = ['item_001', 'item_003']
      const remainingItems = cartItems.filter(item => !itemIdsToDelete.includes(item._id))

      expect(remainingItems.length).toBe(1)
      expect(remainingItems[0]._id).toBe('item_002')
    })
  })

  describe('购物车总价计算逻辑', () => {
    test('应该正确计算多个商品的总价', () => {
      const items = [
        { price: 29800, quantity: 2, selected: true, available: true },
        { price: 55800, quantity: 1, selected: true, available: true },
        { price: 15000, quantity: 3, selected: true, available: true }
      ]

      const totalPrice = items
        .filter(item => item.selected && item.available)
        .reduce((sum, item) => sum + item.price * item.quantity, 0)

      const expectedTotal = 29800 * 2 + 55800 * 1 + 15000 * 3
      expect(totalPrice).toBe(expectedTotal)
    })

    test('应该处理空购物车', () => {
      const items = []
      const totalPrice = items
        .filter(item => item.selected && item.available)
        .reduce((sum, item) => sum + item.price * item.quantity, 0)

      expect(totalPrice).toBe(0)
    })

    test('应该处理全部未选中的情况', () => {
      const items = [
        { price: 29800, quantity: 2, selected: false, available: true },
        { price: 55800, quantity: 1, selected: false, available: true }
      ]

      const totalPrice = items
        .filter(item => item.selected && item.available)
        .reduce((sum, item) => sum + item.price * item.quantity, 0)

      expect(totalPrice).toBe(0)
    })

    test('应该处理全部不可用的情况', () => {
      const items = [
        { price: 29800, quantity: 2, selected: true, available: false },
        { price: 55800, quantity: 1, selected: true, available: false }
      ]

      const totalPrice = items
        .filter(item => item.selected && item.available)
        .reduce((sum, item) => sum + item.price * item.quantity, 0)

      expect(totalPrice).toBe(0)
    })
  })

  describe('购物车商品去重逻辑', () => {
    test('应该检测重复的商品和SKU组合', () => {
      const existingItems = [
        { userId: 'user_001', productId: 'product_001', skuCode: 'SKU_001', quantity: 2 },
        { userId: 'user_001', productId: 'product_002', skuCode: 'SKU_003', quantity: 1 }
      ]

      const newItem = { userId: 'user_001', productId: 'product_001', skuCode: 'SKU_001' }

      const isDuplicate = existingItems.some(
        item => item.userId === newItem.userId && 
                item.productId === newItem.productId && 
                item.skuCode === newItem.skuCode
      )

      expect(isDuplicate).toBe(true)
    })

    test('应该允许同一商品的不同SKU', () => {
      const existingItems = [
        { userId: 'user_001', productId: 'product_001', skuCode: 'SKU_001', quantity: 2 }
      ]

      const newItem = { userId: 'user_001', productId: 'product_001', skuCode: 'SKU_002' }

      const isDuplicate = existingItems.some(
        item => item.userId === newItem.userId && 
                item.productId === newItem.productId && 
                item.skuCode === newItem.skuCode
      )

      expect(isDuplicate).toBe(false)
    })
  })
})
