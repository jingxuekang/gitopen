/**
 * 搜索功能属性测试
 * Feature: tea-shop-miniprogram
 * 
 * 本测试验证商品搜索功能的正确性属性
 */

const fc = require('fast-check');

// 模拟云开发环境
const mockCloud = {
  database: () => mockDb,
  DYNAMIC_CURRENT_ENV: 'test'
};

// 模拟数据库命令
const mockCommand = {
  or: (conditions) => ({ _or: conditions })
};

// 模拟数据库
let mockDbData = {};
const mockDb = {
  command: mockCommand,
  collection: (name) => ({
    where: (query) => ({
      orderBy: (field, order) => ({
        limit: (limitCount) => ({
          get: async () => {
            const data = mockDbData[name] || [];
            
            // 处理搜索查询（包含 _or 条件）
            let filtered = data;
            
            if (query._) {
              // 处理 or 条件
              const orConditions = query._._ || query._._or;
              if (orConditions) {
                filtered = data.filter(item => {
                  // 检查是否满足 status 条件
                  if (query.status !== undefined && item.status !== query.status) {
                    return false;
                  }
                  
                  // 检查是否满足任一 or 条件
                  return orConditions.some(condition => {
                    if (condition.name) {
                      const regex = condition.name;
                      return regex.test(item.name);
                    }
                    if (condition.description) {
                      const regex = condition.description;
                      return regex.test(item.description);
                    }
                    return false;
                  });
                });
              }
            } else {
              // 简单的相等查询
              filtered = data.filter(item => {
                return Object.keys(query).every(key => item[key] === query[key]);
              });
            }
            
            // 排序
            const sorted = [...filtered].sort((a, b) => {
              if (order === 'desc') {
                return b[field] - a[field];
              }
              return a[field] - b[field];
            });
            
            // 限制数量
            const limited = sorted.slice(0, limitCount);
            return { data: limited };
          }
        })
      })
    })
  })
};

// 重置数据库
function resetMockDb() {
  mockDbData = {};
}

// 模拟搜索商品函数
async function searchProducts(keyword) {
  const db = mockCloud.database();
  const _ = db.command;

  if (!keyword || keyword.trim() === '') {
    return {
      code: 400,
      message: '搜索关键词不能为空'
    };
  }

  // 使用正则表达式进行模糊搜索
  const reg = new RegExp(keyword, 'i');
  
  // 搜索商品名称或描述中包含关键词的商品
  const result = await db.collection('products')
    .where({
      status: 1,
      _: _.or([
        { name: reg },
        { description: reg }
      ])
    })
    .orderBy('sales', 'desc')
    .limit(50)
    .get();

  return {
    code: 0,
    message: '搜索成功',
    data: result.data
  };
}

// 模拟搜索历史管理
class SearchHistoryManager {
  constructor() {
    this.history = [];
  }

  addSearchHistory(keyword) {
    // 移除重复项
    this.history = this.history.filter(item => item !== keyword);
    
    // 添加到开头
    this.history.unshift(keyword);
    
    // 限制最多10条
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }
    
    return this.history;
  }

  getSearchHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    return this.history;
  }
}

describe('搜索功能属性测试', () => {
  beforeEach(() => {
    resetMockDb();
  });

  /**
   * 属性 3：搜索结果相关性
   * **验证需求：3.3**
   * 
   * 对于任意搜索关键词，返回的所有商品的名称或描述都应该包含该关键词（不区分大小写）
   */
  test('属性 3：搜索结果相关性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的商品列表
        fc.array(
          fc.record({
            _id: fc.string({ minLength: 10, maxLength: 30 }),
            name: fc.string({ minLength: 5, maxLength: 50 }),
            description: fc.string({ minLength: 10, maxLength: 200 }),
            category: fc.constantFrom('tea', 'chenpi', 'teapot'),
            price: fc.integer({ min: 100, max: 100000 }),
            stock: fc.integer({ min: 0, max: 1000 }),
            sales: fc.integer({ min: 0, max: 10000 }),
            status: fc.constant(1)
          }),
          { minLength: 20, maxLength: 100 }
        ),
        // 生成搜索关键词（从商品名称中提取）
        fc.string({ minLength: 2, maxLength: 10 }),
        async (products, keyword) => {
          // 重置并填充数据库
          resetMockDb();
          mockDbData['products'] = products;
          
          // 执行搜索
          const result = await searchProducts(keyword);
          
          // 验证返回结果
          expect(result.code).toBe(0);
          expect(result.data).toBeDefined();
          expect(Array.isArray(result.data)).toBe(true);
          
          // 核心属性验证：所有返回的商品名称或描述都应该包含关键词（不区分大小写）
          const keywordLower = keyword.toLowerCase();
          result.data.forEach(product => {
            const nameLower = product.name.toLowerCase();
            const descLower = product.description.toLowerCase();
            const containsKeyword = nameLower.includes(keywordLower) || descLower.includes(keywordLower);
            expect(containsKeyword).toBe(true);
          });
          
          // 验证返回的商品数量不超过限制
          expect(result.data.length).toBeLessThanOrEqual(50);
          
          // 验证所有返回的商品都是上架状态
          result.data.forEach(product => {
            expect(product.status).toBe(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：搜索结果按销量降序排列
   * **验证需求：3.3**
   * 
   * 搜索结果应该按照销量从高到低排序
   */
  test('属性：搜索结果按销量降序排列', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2, maxLength: 10 }),
        fc.integer({ min: 10, max: 30 }),
        async (keyword, productCount) => {
          resetMockDb();
          
          // 创建包含关键词的商品
          const products = [];
          for (let i = 0; i < productCount; i++) {
            products.push({
              _id: `product_${i}`,
              name: `${keyword} Product ${i}`,
              description: `Description for product ${i}`,
              category: 'tea',
              price: 1000 + i * 100,
              stock: 100,
              sales: Math.floor(Math.random() * 10000),
              status: 1
            });
          }
          
          mockDbData['products'] = products;
          
          // 执行搜索
          const result = await searchProducts(keyword);
          
          expect(result.code).toBe(0);
          expect(result.data.length).toBeGreaterThan(0);
          
          // 验证销量降序排列
          for (let i = 0; i < result.data.length - 1; i++) {
            expect(result.data[i].sales).toBeGreaterThanOrEqual(result.data[i + 1].sales);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：搜索不区分大小写
   * **验证需求：3.3**
   * 
   * 搜索应该不区分大小写，大写和小写关键词应该返回相同的结果
   */
  test('属性：搜索不区分大小写', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z]+$/.test(s)),
        async (keyword) => {
          resetMockDb();
          
          // 创建包含不同大小写关键词的商品
          const products = [
            {
              _id: 'product_1',
              name: `Product with ${keyword.toLowerCase()}`,
              description: 'Description 1',
              category: 'tea',
              price: 1000,
              stock: 100,
              sales: 100,
              status: 1
            },
            {
              _id: 'product_2',
              name: `Product with ${keyword.toUpperCase()}`,
              description: 'Description 2',
              category: 'tea',
              price: 2000,
              stock: 100,
              sales: 200,
              status: 1
            },
            {
              _id: 'product_3',
              name: 'Other product',
              description: `Description with ${keyword}`,
              category: 'tea',
              price: 3000,
              stock: 100,
              sales: 300,
              status: 1
            }
          ];
          
          mockDbData['products'] = products;
          
          // 使用小写关键词搜索
          const resultLower = await searchProducts(keyword.toLowerCase());
          
          // 使用大写关键词搜索
          const resultUpper = await searchProducts(keyword.toUpperCase());
          
          // 两次搜索应该返回相同数量的结果
          expect(resultLower.data.length).toBe(resultUpper.data.length);
          expect(resultLower.data.length).toBeGreaterThan(0);
          
          // 验证返回的商品ID相同
          const idsLower = resultLower.data.map(p => p._id).sort();
          const idsUpper = resultUpper.data.map(p => p._id).sort();
          expect(idsLower).toEqual(idsUpper);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：空关键词返回错误
   * **验证需求：3.3**
   * 
   * 当搜索关键词为空或只包含空格时，应该返回错误
   */
  test('属性：空关键词返回错误', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t', '\n', '  \t  '),
        async (emptyKeyword) => {
          resetMockDb();
          mockDbData['products'] = [
            {
              _id: 'product_1',
              name: 'Test Product',
              description: 'Test Description',
              category: 'tea',
              price: 1000,
              stock: 100,
              sales: 100,
              status: 1
            }
          ];
          
          const result = await searchProducts(emptyKeyword);
          
          // 应该返回错误
          expect(result.code).toBe(400);
          expect(result.message).toBe('搜索关键词不能为空');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：搜索只返回上架商品
   * **验证需求：3.3**
   * 
   * 搜索结果应该只包含status=1的上架商品
   */
  test('属性：搜索只返回上架商品', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2, maxLength: 10 }),
        async (keyword) => {
          resetMockDb();
          
          // 创建包含上架和下架商品的列表
          const products = [
            {
              _id: 'product_1',
              name: `${keyword} Product 1`,
              description: 'Description 1',
              category: 'tea',
              price: 1000,
              stock: 100,
              sales: 100,
              status: 1  // 上架
            },
            {
              _id: 'product_2',
              name: `${keyword} Product 2`,
              description: 'Description 2',
              category: 'tea',
              price: 2000,
              stock: 100,
              sales: 200,
              status: 0  // 下架
            },
            {
              _id: 'product_3',
              name: `${keyword} Product 3`,
              description: 'Description 3',
              category: 'tea',
              price: 3000,
              stock: 100,
              sales: 300,
              status: 1  // 上架
            }
          ];
          
          mockDbData['products'] = products;
          
          const result = await searchProducts(keyword);
          
          expect(result.code).toBe(0);
          
          // 所有返回的商品都应该是上架状态
          result.data.forEach(product => {
            expect(product.status).toBe(1);
          });
          
          // 不应该包含下架商品
          const ids = result.data.map(p => p._id);
          expect(ids).not.toContain('product_2');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性 13：搜索历史限制
   * **验证需求：3.5**
   * 
   * 对于任意用户，其搜索历史记录数量应该不超过10条，超过时应该删除最旧的记录
   */
  test('属性 13：搜索历史限制', () => {
    fc.assert(
      fc.property(
        // 生成一系列搜索关键词
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 1, maxLength: 50 }
        ),
        (keywords) => {
          const manager = new SearchHistoryManager();
          
          // 依次添加搜索历史
          keywords.forEach(keyword => {
            manager.addSearchHistory(keyword);
          });
          
          const history = manager.getSearchHistory();
          
          // 核心属性验证：搜索历史不超过10条
          expect(history.length).toBeLessThanOrEqual(10);
          
          // 如果添加的关键词超过10个，验证保留的是最新的10条
          if (keywords.length > 10) {
            expect(history.length).toBe(10);
            
            // 获取去重后的最新10条关键词
            const uniqueKeywords = [];
            for (let i = keywords.length - 1; i >= 0 && uniqueKeywords.length < 10; i--) {
              if (!uniqueKeywords.includes(keywords[i])) {
                uniqueKeywords.unshift(keywords[i]);
              }
            }
            
            // 验证历史记录与预期一致
            expect(history).toEqual(uniqueKeywords);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：搜索历史去重
   * **验证需求：3.5**
   * 
   * 重复搜索同一关键词时，应该将该关键词移到最前面，而不是添加重复项
   */
  test('属性：搜索历史去重', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 2, max: 10 }),
        (keyword, repeatCount) => {
          const manager = new SearchHistoryManager();
          
          // 先添加一些其他关键词
          manager.addSearchHistory('keyword1');
          manager.addSearchHistory('keyword2');
          manager.addSearchHistory('keyword3');
          
          // 多次添加同一关键词
          for (let i = 0; i < repeatCount; i++) {
            manager.addSearchHistory(keyword);
          }
          
          const history = manager.getSearchHistory();
          
          // 验证该关键词只出现一次
          const count = history.filter(k => k === keyword).length;
          expect(count).toBe(1);
          
          // 验证该关键词在最前面
          expect(history[0]).toBe(keyword);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：搜索历史保持顺序
   * **验证需求：3.5**
   * 
   * 搜索历史应该按照搜索时间倒序排列，最新的在最前面
   */
  test('属性：搜索历史保持顺序', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 3, maxLength: 10 }
        ).filter(arr => {
          // 确保数组中的元素都是唯一的
          return new Set(arr).size === arr.length;
        }),
        (keywords) => {
          const manager = new SearchHistoryManager();
          
          // 依次添加搜索历史
          keywords.forEach(keyword => {
            manager.addSearchHistory(keyword);
          });
          
          const history = manager.getSearchHistory();
          
          // 验证顺序：最后添加的在最前面
          const expectedOrder = [...keywords].reverse().slice(0, 10);
          expect(history).toEqual(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：清空搜索历史
   * **验证需求：3.5**
   * 
   * 清空搜索历史后，历史记录应该为空数组
   */
  test('属性：清空搜索历史', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 1, maxLength: 20 }
        ),
        (keywords) => {
          const manager = new SearchHistoryManager();
          
          // 添加搜索历史
          keywords.forEach(keyword => {
            manager.addSearchHistory(keyword);
          });
          
          // 验证历史不为空
          expect(manager.getSearchHistory().length).toBeGreaterThan(0);
          
          // 清空历史
          const result = manager.clearHistory();
          
          // 验证历史为空
          expect(result).toEqual([]);
          expect(manager.getSearchHistory()).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：搜索结果数量限制
   * **验证需求：3.3**
   * 
   * 搜索结果最多返回50条商品
   */
  test('属性：搜索结果数量限制', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2, maxLength: 5 }),
        fc.integer({ min: 60, max: 100 }),
        async (keyword, productCount) => {
          resetMockDb();
          
          // 创建大量包含关键词的商品
          const products = [];
          for (let i = 0; i < productCount; i++) {
            products.push({
              _id: `product_${i}`,
              name: `${keyword} Product ${i}`,
              description: `Description ${i}`,
              category: 'tea',
              price: 1000,
              stock: 100,
              sales: i,
              status: 1
            });
          }
          
          mockDbData['products'] = products;
          
          const result = await searchProducts(keyword);
          
          expect(result.code).toBe(0);
          
          // 验证返回的商品数量不超过50条
          expect(result.data.length).toBeLessThanOrEqual(50);
          expect(result.data.length).toBe(50);
        }
      ),
      { numRuns: 100 }
    );
  });
});
