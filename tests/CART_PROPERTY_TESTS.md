# 购物车属性测试文档

## 任务完成情况

✅ **任务 5.2：编写购物车属性测试** 已完成

本任务实现了对需求 5.2（购物车商品去重）和需求 5.4（购物车总价一致性）的属性测试验证。

## 创建的文件

### 测试文件

- **`tests/cart.property.test.js`** - 购物车属性测试
  - 验证4个核心属性，每个运行100次迭代
  - 使用 fast-check 生成随机输入
  - 验证需求 5.2 和 5.4

## 测试内容

### 属性测试（Property-Based Testing）

#### 1. 属性 1：购物车总价一致性
**验证需求：5.4**

对于任意购物车状态，购物车显示的总价应该等于所有选中商品的（单价 × 数量）之和。

**测试策略：**
- 生成随机的商品列表（1-10个商品）
- 生成随机的购物车商品列表（1-20个商品）
- 验证购物车总价 = Σ(选中且可用商品的单价 × 数量)
- 验证每个商品的小计 = 单价 × 数量
- 运行100次迭代

**测试覆盖：**
- 多个商品的总价计算
- 空购物车
- 部分选中的商品
- 部分不可用的商品（库存不足）
- 各种价格和数量组合

#### 2. 属性 8：购物车商品去重
**验证需求：5.2**

对于任意用户和商品SKU，购物车中最多只应该存在一条该用户和该SKU的记录，重复添加应该增加数量。

**测试策略：**
- 生成随机的商品
- 多次添加同一商品的同一SKU（1-10次）
- 每次添加随机数量（1-10个）
- 验证购物车中只有一条记录
- 验证数量是累加的
- 运行100次迭代

**测试覆盖：**
- 重复添加同一商品同一SKU
- 验证数量累加
- 验证记录唯一性

#### 3. 属性：不同SKU应该创建不同的购物车记录
**验证需求：5.2**

对于同一商品的不同SKU，应该创建不同的购物车记录。

**测试策略：**
- 生成至少有2个SKU的商品
- 添加第一个SKU
- 添加第二个SKU
- 验证购物车中有两条记录
- 验证两条记录的SKU不同
- 验证数量正确
- 运行100次迭代

#### 4. 属性：购物车总价只计算选中且可用的商品
**验证需求：5.4**

购物车总价应该只计算选中（selected=true）且可用（available=true）的商品。

**测试策略：**
- 生成随机的商品和购物车商品
- 包含选中/未选中的商品
- 包含可用/不可用的商品（库存不足）
- 验证总价只包含选中且可用的商品
- 验证未选中的商品不计入总价
- 运行100次迭代

## 测试数据生成器

### SKU生成器
```javascript
const skuArbitrary = fc.record({
  skuCode: fc.string({ minLength: 1, maxLength: 20 }),
  specValues: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
  price: fc.integer({ min: 100, max: 1000000 }), // 1元到10000元（单位：分）
  stock: fc.integer({ min: 0, max: 1000 })
});
```

### 商品生成器
```javascript
const productArbitrary = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom('tea', 'chenpi', 'teapot'),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
  skus: fc.array(skuArbitrary, { minLength: 1, maxLength: 5 }),
  status: fc.constant(1)
});
```

### 购物车商品生成器
```javascript
const cartItemArbitrary = fc.record({
  productId: fc.string({ minLength: 1, maxLength: 20 }),
  skuCode: fc.string({ minLength: 1, maxLength: 20 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  selected: fc.boolean()
});
```

## 模拟实现

测试使用内存数据库模拟云开发环境，包括：

1. **模拟云函数**：
   - `addToCart` - 添加商品到购物车
   - `getCart` - 获取购物车列表

2. **模拟数据库**：
   - 支持 `collection().where().get()`
   - 支持 `collection().add()`
   - 支持 `collection().doc().update()`
   - 支持 `db.command.in()` 查询

3. **业务逻辑**：
   - 商品去重逻辑（userId + productId + skuCode）
   - 数量累加逻辑
   - 库存验证
   - 总价计算（只计算选中且可用的商品）

## 运行测试

### 前置要求

1. **安装 Node.js**（版本 >= 14.x）
   - 下载地址：https://nodejs.org/
   - 验证安装：`node --version`

2. **安装依赖**
   ```bash
   npm install
   ```

### 运行方式

#### 方式1：使用测试脚本（推荐）

**Windows:**
```cmd
run-tests.bat
```
选择选项 1 运行所有测试

**Mac/Linux:**
```bash
chmod +x run-tests.sh
./run-tests.sh
```
选择选项 1 运行所有测试

#### 方式2：直接运行

```bash
# 运行所有测试
npm test

# 只运行购物车属性测试
npm test -- tests/cart.property.test.js

# 运行购物车所有测试（单元测试 + 属性测试）
npm test -- tests/cart

# 生成覆盖率报告
npm run test:coverage
```

## 预期测试结果

### 成功输出示例

```
PASS  tests/cart.property.test.js
  购物车属性测试
    ✓ 属性 1：购物车总价一致性 (2345ms)
    ✓ 属性 8：购物车商品去重 (1234ms)
    ✓ 属性：不同SKU应该创建不同的购物车记录 (1567ms)
    ✓ 属性：购物车总价只计算选中且可用的商品 (2890ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        8.036s
```

### 测试统计

- **测试套件**：1个
- **测试用例**：4个
- **总迭代次数**：400次（每个测试100次）
- **预计运行时间**：8-12秒

## 测试特点

### 属性测试的优势

1. **广泛覆盖**：通过随机生成输入，测试大量场景
   - 各种价格组合（1元到10000元）
   - 各种数量组合（1到100个）
   - 各种商品和SKU组合
   - 选中/未选中状态
   - 可用/不可用状态

2. **发现边界问题**：自动发现开发者未考虑的边界情况
   - 空购物车
   - 全部未选中
   - 全部不可用
   - 极端价格和数量

3. **自动缩减**：失败时自动找到最小反例
   - fast-check会自动简化失败的输入
   - 提供最小的可重现失败案例

4. **可重现**：使用种子值可以重现失败的测试
   ```javascript
   fc.assert(..., { seed: 12345, numRuns: 100 })
   ```

### 测试设计原则

1. **隔离性**：每个测试独立运行，使用模拟数据库
2. **可重复性**：测试结果可重现
3. **快速执行**：所有测试在10秒内完成
4. **清晰反馈**：失败时提供详细的错误信息

## 验证的正确性属性

### 属性 1：购物车总价一致性

**形式化定义：**
```
∀ cart_state:
  cart.totalPrice = Σ(item.price × item.quantity)
  where item.selected = true AND item.available = true
```

**验证方法：**
1. 生成随机购物车状态
2. 计算期望总价（手动计算）
3. 调用 getCart 获取实际总价
4. 断言：实际总价 = 期望总价

### 属性 8：购物车商品去重

**形式化定义：**
```
∀ user, product, sku:
  COUNT(cart_items WHERE userId = user AND productId = product AND skuCode = sku) ≤ 1
  
  IF duplicate_add THEN
    new_quantity = old_quantity + add_quantity
```

**验证方法：**
1. 生成随机商品和SKU
2. 多次添加同一商品同一SKU
3. 查询购物车
4. 断言：只有一条记录
5. 断言：数量是累加的

## 故障排除

### 问题：Node.js未安装

**症状：**
```
npm : 无法将"npm"项识别为 cmdlet、函数、脚本文件或可运行程序的名称
```

**解决方案：**
1. 下载并安装 Node.js：https://nodejs.org/
2. 选择 LTS（长期支持）版本
3. 安装完成后重启终端
4. 验证安装：`node --version` 和 `npm --version`

### 问题：依赖安装失败

**解决方案：**
```bash
# 清除缓存
npm cache clean --force

# 删除旧的依赖
rm -rf node_modules package-lock.json  # Mac/Linux
# 或
rmdir /s node_modules & del package-lock.json  # Windows

# 重新安装
npm install
```

### 问题：测试失败

**解决方案：**
1. 查看错误信息，确认是代码问题还是环境问题
2. 对于属性测试失败，fast-check会提供反例
3. 使用反例进行调试：
   ```javascript
   // 在测试中添加
   console.log('失败的输入:', products, cartItems);
   ```
4. 使用种子值重现失败：
   ```javascript
   fc.assert(..., { seed: 失败时显示的种子值 })
   ```

### 问题：测试运行缓慢

**解决方案：**
1. 减少迭代次数（临时调试用）：
   ```javascript
   fc.assert(..., { numRuns: 10 })  // 从100减少到10
   ```
2. 减少生成的数据量：
   ```javascript
   fc.array(productArbitrary, { minLength: 1, maxLength: 3 })  // 从10减少到3
   ```

## 与单元测试的关系

本项目同时包含单元测试和属性测试：

### 单元测试（tests/cart.test.js）
- 测试具体场景
- 验证边界情况
- 快速执行
- 易于理解

### 属性测试（tests/cart.property.test.js）
- 测试通用属性
- 广泛覆盖
- 发现边界问题
- 形式化验证

**两者互补，共同保证代码质量。**

## 相关文件

- `tests/cart.test.js` - 购物车单元测试
- `tests/cart.property.test.js` - 购物车属性测试（本文件）
- `cloudfunctions/addToCart/index.js` - 添加到购物车云函数
- `cloudfunctions/getCart/index.js` - 获取购物车云函数
- `cloudfunctions/CART_FUNCTIONS.md` - 购物车云函数文档

## 相关需求

- **需求 5.2**：WHEN 商品已在购物车中，THE 小程序系统 SHALL 增加该商品的数量
- **需求 5.4**：WHEN 用户修改购物车商品数量，THE 小程序系统 SHALL 实时更新总价

## 相关属性

- **属性 1**：购物车总价一致性 - 对于任意购物车状态，购物车显示的总价应该等于所有选中商品的（单价 × 数量）之和
- **属性 8**：购物车商品去重 - 对于任意用户和商品SKU，购物车中最多只应该存在一条该用户和该SKU的记录，重复添加应该增加数量

## 技术栈

- **测试框架**：Jest 29.5.0
- **属性测试库**：fast-check 3.15.0
- **测试环境**：Node.js
- **模拟策略**：内存数据库模拟

## 参考文档

- [Jest 官方文档](https://jestjs.io/)
- [fast-check 官方文档](https://github.com/dubzzz/fast-check)
- [属性测试指南](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [购物车云函数文档](../cloudfunctions/CART_FUNCTIONS.md)

---

**任务状态**：✅ 完成

**验证需求**：
- 5.2 - WHEN 商品已在购物车中，THE 小程序系统 SHALL 增加该商品的数量
- 5.4 - WHEN 用户修改购物车商品数量，THE 小程序系统 SHALL 实时更新总价

**测试方法**：属性测试（Property-Based Testing）

**测试覆盖**：4个属性测试，400次迭代

**下一步**：运行测试验证功能正确性
