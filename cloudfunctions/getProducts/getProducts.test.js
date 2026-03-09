/**
 * 商品分类过滤属性测试
 * Feature: tea-shop-miniprogram
 * 
 * 本测试验证商品分类过滤功能的正确性属性
 */

const fc = require('fast-check');

// 模拟云开发环境
const mockCloud = {
  database: () => mockDb,
  DYNAMIC_CURRENT_ENV: 'test'
};

// 模拟数据库
let mockDbData = {};
const mockDb = {
  collection: (name) => ({
    where: (query) => ({
      orderBy: (field, order) => ({
        skip: (skipCount) => ({
          limit: (limitCount) => ({
            get: async () => {
              const data = mockDbData[name] || [];
              // 过滤数据
              const filtered = data.filter(item => {
                return Object.keys(query).every(key => item[key] === query[key]);
              });
              // 排序
              const sorted = [...filtered].sort((a, b) => {
                if (order === 'desc') {
                  return b[field] - a[field];
                }
                return a[field] - b[field];
              });
              // 分页
              const paginated = sorted.slice(skipCount, skipCount + limitCount);
              return { data: paginated };
            }
          })
        })
      }),
      count: async () => {
        const data = mockDbData[name] || [];
        const filtered = data.filter(item => {
          return Object.keys(query).every(key => item[key] === query[key]);
        });
        return { total: filtered.length };
      }
    })
  })
};

// 重置数据库
function resetMockDb() {
  mockDbData = {};
}

// 模拟获取商品列表函数
async function getProducts(category, page = 1, pageSize = 20) {
  const db = mockCloud.database();
  
  // 构建查询条件
  const where = { status: 1 };
  
  if (category) {
    where.category = category;
  }

  // 计算跳过的数量
  const skip = (page - 1) * pageSize;

  // 查询商品列表
  const result = await db.collection('products')
    .where(where)
    .orderBy('sales', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  // 查询总数
  const countResult = await db.collection('products')
    .where(where)
    .count();

  return {
    code: 0,
    message: '获取成功',
    data: {
      list: result.data,
      total: countResult.total,
      page,
      pageSize,
      hasMore: skip + result.data.length < countResult.total
    }
  };
}

describe('商品分类过滤属性测试', () => {
  beforeEach(() => {
    resetMockDb();
  });

  /**
   * 属性 2：商品分类过滤正确性
   * **验证需求：2.2**
   * 
   * 对于任意商品分类查询，返回的所有商品的category字段都应该等于查询的分类值
   */
  test('属性 2：商品分类过滤正确性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的商品列表
        fc.array(
          fc.record({
            _id: fc.string({ minLength: 10, maxLength: 30 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            category: fc.constantFrom('tea', 'chenpi', 'teapot'),
            price: fc.integer({ min: 100, max: 100000 }),
            stock: fc.integer({ min: 0, max: 1000 }),
            sales: fc.integer({ min: 0, max: 10000 }),
            status: fc.constant(1)
          }),
          { minLength: 10, maxLength: 100 }
        ),
        // 生成要查询的分类
        fc.constantFrom('tea', 'chenpi', 'teapot'),
        async (products, queryCategory) => {
          // 重置并填充数据库
          resetMockDb();
          mockDbData['products'] = products;
          
          // 执行查询
          const result = await getProducts(queryCategory, 1, 50);
          
          // 验证返回结果
          expect(result.code).toBe(0);
          expect(result.data.list).toBeDefined();
          expect(Array.isArray(result.data.list)).toBe(true);
          
          // 核心属性验证：所有返回的商品都应该属于查询的分类
          result.data.list.forEach(product => {
            expect(product.category).toBe(queryCategory);
          });
          
          // 验证返回的商品数量与预期一致
          const expectedProducts = products.filter(p => p.category === queryCategory);
          const expectedCount = Math.min(expectedProducts.length, 50);
          expect(result.data.list.length).toBe(expectedCount);
          
          // 验证总数正确
          expect(result.data.total).toBe(expectedProducts.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：不指定分类时返回所有上架商品
   * **验证需求：2.2**
   * 
   * 当不指定分类参数时，应该返回所有status=1的商品
   */
  test('属性：不指定分类时返回所有上架商品', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            _id: fc.string({ minLength: 10, maxLength: 30 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            category: fc.constantFrom('tea', 'chenpi', 'teapot'),
            price: fc.integer({ min: 100, max: 100000 }),
            stock: fc.integer({ min: 0, max: 1000 }),
            sales: fc.integer({ min: 0, max: 10000 }),
            status: fc.constant(1)
          }),
          { minLength: 5, maxLength: 50 }
        ),
        async (products) => {
          resetMockDb();
          mockDbData['products'] = products;
          
          // 不指定分类查询
          const result = await getProducts(null, 1, 100);
          
          expect(result.code).toBe(0);
          
          // 应该返回所有上架商品
          expect(result.data.total).toBe(products.length);
          
          // 所有返回的商品都应该是上架状态
          result.data.list.forEach(product => {
            expect(product.status).toBe(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：分类过滤不影响其他分类的商品
   * **验证需求：2.2**
   * 
   * 查询某个分类时，不应该返回其他分类的商品
   */
  test('属性：分类过滤不影响其他分类的商品', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tea', 'chenpi', 'teapot'),
        fc.integer({ min: 5, max: 20 }),
        async (targetCategory, productsPerCategory) => {
          resetMockDb();
          
          // 为每个分类创建商品
          const allProducts = [];
          const categories = ['tea', 'chenpi', 'teapot'];
          
          categories.forEach(cat => {
            for (let i = 0; i < productsPerCategory; i++) {
              allProducts.push({
                _id: `${cat}_${i}`,
                name: `${cat}_product_${i}`,
                category: cat,
                price: 1000 + i * 100,
                stock: 100,
                sales: i * 10,
                status: 1
              });
            }
          });
          
          mockDbData['products'] = allProducts;
          
          // 查询目标分类
          const result = await getProducts(targetCategory, 1, 100);
          
          expect(result.code).toBe(0);
          
          // 验证返回的商品数量
          expect(result.data.total).toBe(productsPerCategory);
          expect(result.data.list.length).toBe(productsPerCategory);
          
          // 验证所有商品都是目标分类
          result.data.list.forEach(product => {
            expect(product.category).toBe(targetCategory);
          });
          
          // 验证没有其他分类的商品
          const otherCategories = categories.filter(c => c !== targetCategory);
          result.data.list.forEach(product => {
            otherCategories.forEach(otherCat => {
              expect(product.category).not.toBe(otherCat);
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：分页不影响分类过滤的正确性
   * **验证需求：2.2**
   * 
   * 无论如何分页，每一页返回的商品都应该属于查询的分类
   */
  test('属性：分页不影响分类过滤的正确性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tea', 'chenpi', 'teapot'),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 5, max: 15 }),
        async (category, page, pageSize) => {
          resetMockDb();
          
          // 创建足够多的商品
          const products = [];
          for (let i = 0; i < 100; i++) {
            products.push({
              _id: `product_${i}`,
              name: `Product ${i}`,
              category: i % 3 === 0 ? 'tea' : (i % 3 === 1 ? 'chenpi' : 'teapot'),
              price: 1000 + i * 100,
              stock: 100,
              sales: i * 10,
              status: 1
            });
          }
          
          mockDbData['products'] = products;
          
          // 查询指定分类的指定页
          const result = await getProducts(category, page, pageSize);
          
          expect(result.code).toBe(0);
          
          // 验证所有返回的商品都属于查询的分类
          result.data.list.forEach(product => {
            expect(product.category).toBe(category);
          });
          
          // 验证分页信息
          expect(result.data.page).toBe(page);
          expect(result.data.pageSize).toBe(pageSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：空结果集的正确处理
   * **验证需求：2.2**
   * 
   * 当某个分类没有商品时，应该返回空列表而不是错误
   */
  test('属性：空结果集的正确处理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tea', 'chenpi', 'teapot'),
        async (queryCategory) => {
          resetMockDb();
          
          // 创建只包含其他分类的商品
          const otherCategories = ['tea', 'chenpi', 'teapot'].filter(c => c !== queryCategory);
          const products = [];
          
          otherCategories.forEach(cat => {
            for (let i = 0; i < 10; i++) {
              products.push({
                _id: `${cat}_${i}`,
                name: `${cat}_product_${i}`,
                category: cat,
                price: 1000,
                stock: 100,
                sales: 10,
                status: 1
              });
            }
          });
          
          mockDbData['products'] = products;
          
          // 查询没有商品的分类
          const result = await getProducts(queryCategory, 1, 20);
          
          expect(result.code).toBe(0);
          expect(result.data.list).toEqual([]);
          expect(result.data.total).toBe(0);
          expect(result.data.hasMore).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
