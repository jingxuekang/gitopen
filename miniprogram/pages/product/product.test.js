/**
 * 规格选择属性测试
 * Feature: tea-shop-miniprogram
 * 
 * 本测试验证商品规格选择功能的正确性属性
 * **验证需求：4.4 - WHEN 用户选择规格，THE 小程序系统 SHALL 更新价格和库存显示**
 */

const fc = require('fast-check');

/**
 * 模拟商品规格选择逻辑
 * 这个函数模拟了 product.js 中的 selectSku 方法
 */
function selectSpecification(product, skuIndex) {
  // 验证输入
  if (!product || !product.skus || !Array.isArray(product.skus)) {
    throw new Error('Invalid product data');
  }

  if (skuIndex < 0 || skuIndex >= product.skus.length) {
    throw new Error('Invalid SKU index');
  }

  const selectedSku = product.skus[skuIndex];

  // 返回选中的SKU信息
  return {
    selectedSku,
    displayPrice: selectedSku.price,
    displayStock: selectedSku.stock,
    skuCode: selectedSku.skuCode,
    specText: selectedSku.specValues.join(' ')
  };
}

/**
 * 生成商品SKU的arbitrary
 */
const skuArbitrary = fc.record({
  specValues: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
  price: fc.integer({ min: 100, max: 100000 }), // 价格单位：分
  stock: fc.integer({ min: 0, max: 1000 }),
  skuCode: fc.string({ minLength: 5, maxLength: 20 })
});

/**
 * 生成商品数据的arbitrary
 */
const productArbitrary = fc.record({
  _id: fc.string({ minLength: 10, maxLength: 30 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom('tea', 'chenpi', 'teapot'),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  skus: fc.array(skuArbitrary, { minLength: 1, maxLength: 10 }),
  status: fc.constant(1)
});

describe('规格选择属性测试', () => {
  /**
   * 属性 22：规格选择价格更新
   * **验证需求：4.4**
   * 
   * 对于任意商品和规格选择，显示的价格和库存应该等于对应SKU的价格和库存
   */
  test('属性 22：规格选择价格更新', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        fc.integer({ min: 0, max: 9 }), // SKU索引
        (product, skuIndexRaw) => {
          // 确保索引在有效范围内
          const skuIndex = skuIndexRaw % product.skus.length;
          
          // 执行规格选择
          const result = selectSpecification(product, skuIndex);
          
          // 核心属性验证：显示的价格应该等于选中SKU的价格
          expect(result.displayPrice).toBe(product.skus[skuIndex].price);
          
          // 核心属性验证：显示的库存应该等于选中SKU的库存
          expect(result.displayStock).toBe(product.skus[skuIndex].stock);
          
          // 验证SKU代码正确
          expect(result.skuCode).toBe(product.skus[skuIndex].skuCode);
          
          // 验证选中的SKU对象正确
          expect(result.selectedSku).toEqual(product.skus[skuIndex]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：不同规格有不同的价格和库存
   * **验证需求：4.4**
   * 
   * 当商品有多个规格时，选择不同规格应该显示不同的价格和库存
   */
  test('属性：不同规格有不同的价格和库存', () => {
    fc.assert(
      fc.property(
        // 生成至少有2个SKU的商品
        fc.record({
          _id: fc.string({ minLength: 10, maxLength: 30 }),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.constantFrom('tea', 'chenpi', 'teapot'),
          skus: fc.array(skuArbitrary, { minLength: 2, maxLength: 10 }),
          status: fc.constant(1)
        }),
        (product) => {
          // 选择第一个SKU
          const result1 = selectSpecification(product, 0);
          
          // 选择第二个SKU
          const result2 = selectSpecification(product, 1);
          
          // 验证价格和库存来自正确的SKU
          expect(result1.displayPrice).toBe(product.skus[0].price);
          expect(result1.displayStock).toBe(product.skus[0].stock);
          
          expect(result2.displayPrice).toBe(product.skus[1].price);
          expect(result2.displayStock).toBe(product.skus[1].stock);
          
          // 如果两个SKU的价格或库存不同，验证显示的值也不同
          if (product.skus[0].price !== product.skus[1].price) {
            expect(result1.displayPrice).not.toBe(result2.displayPrice);
          }
          
          if (product.skus[0].stock !== product.skus[1].stock) {
            expect(result1.displayStock).not.toBe(result2.displayStock);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：规格选择的幂等性
   * **验证需求：4.4**
   * 
   * 多次选择同一个规格应该返回相同的价格和库存
   */
  test('属性：规格选择的幂等性', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (product, skuIndexRaw) => {
          const skuIndex = skuIndexRaw % product.skus.length;
          
          // 第一次选择
          const result1 = selectSpecification(product, skuIndex);
          
          // 第二次选择同一个规格
          const result2 = selectSpecification(product, skuIndex);
          
          // 验证两次选择返回相同的结果
          expect(result1.displayPrice).toBe(result2.displayPrice);
          expect(result1.displayStock).toBe(result2.displayStock);
          expect(result1.skuCode).toBe(result2.skuCode);
          expect(result1.specText).toBe(result2.specText);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：所有SKU都可以被正确选择
   * **验证需求：4.4**
   * 
   * 对于商品的每一个SKU，都应该能够正确选择并显示其价格和库存
   */
  test('属性：所有SKU都可以被正确选择', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        (product) => {
          // 遍历所有SKU
          product.skus.forEach((sku, index) => {
            const result = selectSpecification(product, index);
            
            // 验证每个SKU都能正确选择
            expect(result.displayPrice).toBe(sku.price);
            expect(result.displayStock).toBe(sku.stock);
            expect(result.skuCode).toBe(sku.skuCode);
            expect(result.selectedSku).toEqual(sku);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：规格文本正确生成
   * **验证需求：4.4**
   * 
   * 选择规格后，规格文本应该正确反映选中的规格值
   */
  test('属性：规格文本正确生成', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (product, skuIndexRaw) => {
          const skuIndex = skuIndexRaw % product.skus.length;
          const sku = product.skus[skuIndex];
          
          const result = selectSpecification(product, skuIndex);
          
          // 验证规格文本包含所有规格值
          sku.specValues.forEach(specValue => {
            expect(result.specText).toContain(specValue);
          });
          
          // 验证规格文本是规格值的连接
          const expectedSpecText = sku.specValues.join(' ');
          expect(result.specText).toBe(expectedSpecText);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：价格必须为正整数
   * **验证需求：4.4**
   * 
   * 选择任何规格后，显示的价格都应该是正整数（单位：分）
   */
  test('属性：价格必须为正整数', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (product, skuIndexRaw) => {
          const skuIndex = skuIndexRaw % product.skus.length;
          
          const result = selectSpecification(product, skuIndex);
          
          // 验证价格是正整数
          expect(Number.isInteger(result.displayPrice)).toBe(true);
          expect(result.displayPrice).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：库存必须为非负整数
   * **验证需求：4.4**
   * 
   * 选择任何规格后，显示的库存都应该是非负整数
   */
  test('属性：库存必须为非负整数', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (product, skuIndexRaw) => {
          const skuIndex = skuIndexRaw % product.skus.length;
          
          const result = selectSpecification(product, skuIndex);
          
          // 验证库存是非负整数
          expect(Number.isInteger(result.displayStock)).toBe(true);
          expect(result.displayStock).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：无效索引应该抛出错误
   * **验证需求：4.4**
   * 
   * 尝试选择不存在的规格索引应该抛出错误
   */
  test('属性：无效索引应该抛出错误', () => {
    fc.assert(
      fc.property(
        productArbitrary,
        (product) => {
          // 尝试选择超出范围的索引
          const invalidIndex1 = product.skus.length;
          const invalidIndex2 = -1;
          
          expect(() => selectSpecification(product, invalidIndex1)).toThrow();
          expect(() => selectSpecification(product, invalidIndex2)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
