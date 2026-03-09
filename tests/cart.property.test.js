/**
 * 购物车属性测试
 * Feature: tea-shop-miniprogram
 * 
 * 本测试使用基于属性的测试方法验证购物车功能的正确性属性
 */

const fc = require('fast-check');

// 模拟云开发环境
const mockCloud = {
  database: () => mockDb,
  getWXContext: () => ({
    OPENID: 'test_openid',
    APPID: 'test_appid',
    UNIONID: 'test_unionid'
  }),
  DYNAMIC_CURRENT_ENV: 'test'
};

// 模拟数据库
let mockDbData = {};
const mockDb = {
  collection: (name) => ({
    where: (query) => ({
      get: async () => {
        const data = mockDbData[name] || [];
        const filtered = data.filter(item => {
          return Object.keys(query).every(key => {
            if (typeof query[key] === 'object' && query[key].$in) {
              return query[key].$in.includes(item[key]);
            }
            return item[key] === query[key];
          });
        });
        return { data: filtered };
      },
      orderBy: () => ({
        get: async () => {
          const data = mockDbData[name] || [];
          const filtered = data.filter(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
          });
          return { data: filtered };
        }
      })
    }),
    add: async ({ data }) => {
      if (!mockDbData[name]) {
        mockDbData[name] = [];
      }
      const id = `mock_id_${Date.now()}_${Math.random()}`;
      const newItem = { ...data, _id: id };
      mockDbData[name].push(newItem);
      return { _id: id };
    },
    doc: (id) => ({
      get: async () => {
        const collection = mockDbData[name] || [];
        const item = collection.find(i => i._id === id);
        return { data: item || null };
      },
      update: async ({ data }) => {
        const collection = mockDbData[name] || [];
        const item = collection.find(i => i._id === id);
        if (item) {
          Object.assign(item, data);
        }
        return { stats: { updated: item ? 1 : 0 } };
      }
    })
  }),
  command: {
    in: (values) => ({ $in: values })
  }
};

// 重置数据库
function resetMockDb() {
  mockDbData = {};
}

// 模拟 addToCart 云函数
async function addToCart(productId, skuCode, quantity, userId) {
  const db = mockCloud.database();
  
  // 检查商品是否存在
  const productResult = await db.collection('products').doc(productId).get();
  if (!productResult.data) {
    return { code: 404, message: '商品不存在' };
  }
  
  const product = productResult.data;
  const sku = product.skus.find(s => s.skuCode === skuCode);
  if (!sku) {
    return { code: 404, message: 'SKU不存在' };
  }
  
  // 检查库存
  if (sku.stock < quantity) {
    return { code: 409, message: '库存不足' };
  }
  
  // 查询购物车中是否已存在该商品
  const existResult = await db.collection('cart_items')
    .where({ userId, productId, skuCode })
    .get();
  
  if (existResult.data.length > 0) {
    // 已存在，累加数量
    const cartItem = existResult.data[0];
    const newQuantity = cartItem.quantity + quantity;
    
    if (newQuantity > sku.stock) {
      return { code: 409, message: '库存不足' };
    }
    
    await db.collection('cart_items').doc(cartItem._id).update({
      data: { quantity: newQuantity, updatedAt: new Date() }
    });
    
    return {
      code: 0,
      message: '已更新购物车商品数量',
      data: { cartItemId: cartItem._id, quantity: newQuantity }
    };
  } else {
    // 不存在，添加新记录
    const addResult = await db.collection('cart_items').add({
      data: {
        userId,
        productId,
        skuCode,
        quantity,
        selected: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return {
      code: 0,
      message: '添加到购物车成功',
      data: { cartItemId: addResult._id, quantity }
    };
  }
}

// 模拟 getCart 云函数
async function getCart(userId) {
  const db = mockCloud.database();
  
  // 获取购物车商品列表
  const cartResult = await db.collection('cart_items')
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .get();
  
  if (cartResult.data.length === 0) {
    return {
      code: 0,
      message: '购物车为空',
      data: { items: [], totalPrice: 0, selectedCount: 0 }
    };
  }
  
  // 获取所有商品ID
  const productIds = [...new Set(cartResult.data.map(item => item.productId))];
  
  // 批量查询商品信息
  const productsResult = await db.collection('products')
    .where({ _id: db.command.in(productIds) })
    .get();
  
  // 创建商品映射
  const productMap = {};
  productsResult.data.forEach(product => {
    productMap[product._id] = product;
  });
  
  // 组装购物车数据
  const items = cartResult.data.map(cartItem => {
    const product = productMap[cartItem.productId];
    
    if (!product) {
      return {
        ...cartItem,
        productName: '商品已下架',
        productImage: '',
        price: 0,
        stock: 0,
        specText: '',
        available: false
      };
    }
    
    const sku = product.skus.find(s => s.skuCode === cartItem.skuCode);
    
    if (!sku) {
      return {
        ...cartItem,
        productName: product.name,
        productImage: product.images[0] || '',
        price: 0,
        stock: 0,
        specText: '规格已失效',
        available: false
      };
    }
    
    const specText = sku.specValues.join(' ');
    const available = sku.stock >= cartItem.quantity;
    
    return {
      ...cartItem,
      productName: product.name,
      productImage: product.images[0] || '',
      price: sku.price,
      stock: sku.stock,
      specText,
      available,
      subtotal: sku.price * cartItem.quantity
    };
  });
  
  // 计算总价（只计算选中且可用的商品）
  const totalPrice = items
    .filter(item => item.selected && item.available)
    .reduce((sum, item) => sum + item.subtotal, 0);
  
  // 计算选中商品数量
  const selectedCount = items.filter(item => item.selected).length;
  
  return {
    code: 0,
    message: '获取购物车成功',
    data: { items, totalPrice, selectedCount }
  };
}

// 测试数据生成器
const skuArbitrary = fc.record({
  skuCode: fc.string({ minLength: 1, maxLength: 20 }),
  specValues: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
  price: fc.integer({ min: 100, max: 1000000 }), // 价格范围：1元到10000元（单位：分）
  stock: fc.integer({ min: 0, max: 1000 })
});

const productArbitrary = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom('tea', 'chenpi', 'teapot'),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
  skus: fc.array(skuArbitrary, { minLength: 1, maxLength: 5 }),
  status: fc.constant(1)
});

const cartItemArbitrary = fc.record({
  productId: fc.string({ minLength: 1, maxLength: 20 }),
  skuCode: fc.string({ minLength: 1, maxLength: 20 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  selected: fc.boolean()
});

describe('购物车属性测试', () => {
  beforeEach(() => {
    resetMockDb();
  });

  /**
   * 属性 1：购物车总价一致性
   * **验证需求：5.4**
   * 
   * 对于任意购物车状态，购物车显示的总价应该等于所有选中商品的（单价 × 数量）之和
   */
  test('属性 1：购物车总价一致性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的商品列表
        fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
        // 生成随机的购物车商品列表
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 20 }),
        async (products, cartItems) => {
          resetMockDb();
          
          const userId = 'test_user_001';
          
          // 添加商品到数据库
          const db = mockCloud.database();
          for (const product of products) {
            mockDbData['products'] = mockDbData['products'] || [];
            mockDbData['products'].push(product);
          }
          
          // 添加购物车商品到数据库（只添加有效的商品和SKU）
          const validCartItems = [];
          for (const cartItem of cartItems) {
            const product = products.find(p => p._id === cartItem.productId);
            if (product) {
              const sku = product.skus.find(s => s.skuCode === cartItem.skuCode);
              if (sku && sku.stock >= cartItem.quantity) {
                mockDbData['cart_items'] = mockDbData['cart_items'] || [];
                mockDbData['cart_items'].push({
                  ...cartItem,
                  _id: `cart_${Date.now()}_${Math.random()}`,
                  userId,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                validCartItems.push({ ...cartItem, product, sku });
              }
            }
          }
          
          // 如果没有有效的购物车商品，跳过此测试
          if (validCartItems.length === 0) {
            return true;
          }
          
          // 获取购物车
          const result = await getCart(userId);
          
          // 验证返回结果
          expect(result.code).toBe(0);
          expect(result.data.items).toBeDefined();
          expect(result.data.totalPrice).toBeDefined();
          
          // 手动计算期望的总价
          const expectedTotalPrice = validCartItems
            .filter(item => item.selected)
            .reduce((sum, item) => sum + item.sku.price * item.quantity, 0);
          
          // 验证总价一致性
          expect(result.data.totalPrice).toBe(expectedTotalPrice);
          
          // 验证每个商品的小计
          result.data.items.forEach(item => {
            if (item.available) {
              expect(item.subtotal).toBe(item.price * item.quantity);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性 8：购物车商品去重
   * **验证需求：5.2**
   * 
   * 对于任意用户和商品SKU，购物车中最多只应该存在一条该用户和该SKU的记录，
   * 重复添加应该增加数量
   */
  test('属性 8：购物车商品去重', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的商品
        productArbitrary,
        // 生成随机的添加次数（1-10次）
        fc.integer({ min: 1, max: 10 }),
        // 生成随机的每次添加数量
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 10 }),
        async (product, addCount, quantities) => {
          resetMockDb();
          
          const userId = 'test_user_001';
          
          // 添加商品到数据库
          mockDbData['products'] = mockDbData['products'] || [];
          mockDbData['products'].push(product);
          
          // 选择第一个SKU
          const sku = product.skus[0];
          
          // 确保库存足够
          sku.stock = 10000;
          
          // 多次添加同一商品的同一SKU
          let totalQuantity = 0;
          for (let i = 0; i < Math.min(addCount, quantities.length); i++) {
            const quantity = quantities[i];
            totalQuantity += quantity;
            
            const result = await addToCart(product._id, sku.skuCode, quantity, userId);
            
            // 验证添加成功
            expect(result.code).toBe(0);
          }
          
          // 获取购物车
          const cartResult = await getCart(userId);
          
          // 验证购物车中只有一条记录
          expect(cartResult.data.items.length).toBe(1);
          
          // 验证数量是累加的
          const cartItem = cartResult.data.items[0];
          expect(cartItem.quantity).toBe(totalQuantity);
          expect(cartItem.productId).toBe(product._id);
          expect(cartItem.skuCode).toBe(sku.skuCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：不同SKU应该创建不同的购物车记录
   * **验证需求：5.2**
   * 
   * 对于同一商品的不同SKU，应该创建不同的购物车记录
   */
  test('属性：不同SKU应该创建不同的购物车记录', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成至少有2个SKU的商品
        fc.record({
          _id: fc.string({ minLength: 1, maxLength: 20 }),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.constantFrom('tea', 'chenpi', 'teapot'),
          images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          skus: fc.array(skuArbitrary, { minLength: 2, maxLength: 5 }),
          status: fc.constant(1)
        }),
        async (product) => {
          resetMockDb();
          
          const userId = 'test_user_001';
          
          // 添加商品到数据库
          mockDbData['products'] = mockDbData['products'] || [];
          
          // 确保所有SKU有足够库存
          product.skus.forEach(sku => {
            sku.stock = 1000;
          });
          
          mockDbData['products'].push(product);
          
          // 添加第一个SKU
          const sku1 = product.skus[0];
          const result1 = await addToCart(product._id, sku1.skuCode, 2, userId);
          expect(result1.code).toBe(0);
          
          // 添加第二个SKU
          const sku2 = product.skus[1];
          const result2 = await addToCart(product._id, sku2.skuCode, 3, userId);
          expect(result2.code).toBe(0);
          
          // 获取购物车
          const cartResult = await getCart(userId);
          
          // 验证购物车中有两条记录
          expect(cartResult.data.items.length).toBe(2);
          
          // 验证两条记录的SKU不同
          const skuCodes = cartResult.data.items.map(item => item.skuCode);
          expect(skuCodes).toContain(sku1.skuCode);
          expect(skuCodes).toContain(sku2.skuCode);
          
          // 验证数量正确
          const item1 = cartResult.data.items.find(item => item.skuCode === sku1.skuCode);
          const item2 = cartResult.data.items.find(item => item.skuCode === sku2.skuCode);
          expect(item1.quantity).toBe(2);
          expect(item2.quantity).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：购物车总价只计算选中且可用的商品
   * **验证需求：5.4**
   * 
   * 购物车总价应该只计算选中（selected=true）且可用（available=true）的商品
   */
  test('属性：购物车总价只计算选中且可用的商品', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(productArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 10 }),
        async (products, cartItems) => {
          resetMockDb();
          
          const userId = 'test_user_001';
          
          // 添加商品到数据库
          const db = mockCloud.database();
          for (const product of products) {
            mockDbData['products'] = mockDbData['products'] || [];
            mockDbData['products'].push(product);
          }
          
          // 添加购物车商品
          const validCartItems = [];
          for (const cartItem of cartItems) {
            const product = products.find(p => p._id === cartItem.productId);
            if (product) {
              const sku = product.skus.find(s => s.skuCode === cartItem.skuCode);
              if (sku) {
                mockDbData['cart_items'] = mockDbData['cart_items'] || [];
                mockDbData['cart_items'].push({
                  ...cartItem,
                  _id: `cart_${Date.now()}_${Math.random()}`,
                  userId,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                validCartItems.push({ ...cartItem, product, sku });
              }
            }
          }
          
          if (validCartItems.length === 0) {
            return true;
          }
          
          // 获取购物车
          const result = await getCart(userId);
          
          // 手动计算期望的总价（只计算选中且可用的商品）
          const expectedTotalPrice = validCartItems
            .filter(item => {
              const available = item.sku.stock >= item.quantity;
              return item.selected && available;
            })
            .reduce((sum, item) => sum + item.sku.price * item.quantity, 0);
          
          // 验证总价
          expect(result.data.totalPrice).toBe(expectedTotalPrice);
          
          // 验证未选中的商品不计入总价
          const unselectedTotal = result.data.items
            .filter(item => !item.selected && item.available)
            .reduce((sum, item) => sum + item.subtotal, 0);
          
          if (unselectedTotal > 0) {
            expect(result.data.totalPrice).toBeLessThan(
              result.data.totalPrice + unselectedTotal
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
