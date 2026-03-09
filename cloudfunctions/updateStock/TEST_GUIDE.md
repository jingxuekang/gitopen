# updateStock 云函数测试指南

## 运行测试

```bash
# 运行所有测试
npm test

# 运行 updateStock 测试
npm test -- updateStock.test.js

# 运行测试并查看覆盖率
npm test -- --coverage updateStock.test.js
```

## 测试用例

### 1. 参数验证测试
- ✅ 缺少 productId 应该返回错误
- ✅ 商品不存在应该返回错误
- ✅ SKU不存在应该返回错误
- ✅ set操作库存为负数应该返回错误

### 2. set 操作测试
- ✅ 应该正确设置SKU库存
- ✅ 设置库存为0应该返回缺货预警
- ✅ 设置库存≤10应该返回库存不足预警

### 3. increase 操作测试
- ✅ 应该正确增加SKU库存
- ✅ 增加数量≤0应该返回错误

### 4. decrease 操作测试
- ✅ 应该正确减少SKU库存
- ✅ 减少后库存不应该为负数

### 5. 批量更新测试
- ✅ 应该平均分配库存到所有SKU

## 手动测试

### 测试场景 1：更新单个SKU库存

```javascript
// 在微信开发者工具的云函数控制台执行
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'your_product_id',
    skuCode: 'sku_001',
    stock: 50,
    operation: 'set'
  }
}).then(res => {
  console.log('更新结果:', res.result)
})
```

**预期结果：**
- success: true
- 返回更新前后的库存数量
- 如果库存≤10，返回预警信息

### 测试场景 2：增加库存

```javascript
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'your_product_id',
    skuCode: 'sku_001',
    stock: 20,
    operation: 'increase'
  }
}).then(res => {
  console.log('增加结果:', res.result)
})
```

**预期结果：**
- 库存数量增加20

### 测试场景 3：减少库存

```javascript
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'your_product_id',
    skuCode: 'sku_001',
    stock: 10,
    operation: 'decrease'
  }
}).then(res => {
  console.log('减少结果:', res.result)
})
```

**预期结果：**
- 库存数量减少10
- 如果减少后≤0，库存为0（不会为负数）

### 测试场景 4：批量更新所有SKU

```javascript
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'your_product_id',
    stock: 100,
    operation: 'set'
  }
}).then(res => {
  console.log('批量更新结果:', res.result)
})
```

**预期结果：**
- 所有SKU的库存被平均分配
- 返回总库存和SKU数量

### 测试场景 5：库存预警

```javascript
// 设置库存为0，测试缺货预警
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'your_product_id',
    skuCode: 'sku_001',
    stock: 0,
    operation: 'set'
  }
}).then(res => {
  console.log('预警信息:', res.result.data.warnings)
})
```

**预期结果：**
- warnings数组包含缺货预警
- type: 'out_of_stock'

```javascript
// 设置库存为5，测试库存不足预警
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'your_product_id',
    skuCode: 'sku_001',
    stock: 5,
    operation: 'set'
  }
}).then(res => {
  console.log('预警信息:', res.result.data.warnings)
})
```

**预期结果：**
- warnings数组包含库存不足预警
- type: 'low_stock'

## 前端测试

### 测试商品详情页库存状态显示

1. 打开商品详情页
2. 检查库存状态显示：
   - 库存 > 10：正常显示，无预警条
   - 0 < 库存 ≤ 10：显示橙色预警条"库存紧张 - 仅剩X件"
   - 库存 = 0：显示红色预警条"缺货 - 暂时无法购买"

3. 检查购买按钮状态：
   - 有库存：按钮可点击
   - 无库存：按钮禁用，显示"已售罄"

4. 检查规格选择器：
   - 缺货规格显示灰色，标记"已售罄"
   - 点击缺货规格提示"该规格已售罄"

## 集成测试

### 测试库存一致性

1. 创建订单 → 检查库存是否锁定
2. 支付成功 → 检查库存是否扣减
3. 取消订单 → 检查库存是否释放
4. 订单超时 → 检查库存是否恢复

### 测试库存预警查询

```javascript
wx.cloud.callFunction({
  name: 'getStockWarnings',
  data: {
    warningType: 'all'
  }
}).then(res => {
  console.log('预警列表:', res.result.data.warnings)
  console.log('统计信息:', res.result.data.stats)
})
```

**预期结果：**
- 返回所有库存不足和缺货的商品
- 按优先级排序（缺货优先）
- 提供统计信息

## 性能测试

### 批量更新性能

测试批量更新100个商品的性能：

```javascript
const products = [...] // 100个商品ID

const promises = products.map(productId => 
  wx.cloud.callFunction({
    name: 'updateStock',
    data: {
      productId,
      stock: 100,
      operation: 'set'
    }
  })
)

console.time('批量更新')
Promise.all(promises).then(() => {
  console.timeEnd('批量更新')
})
```

**性能目标：**
- 单次更新 < 500ms
- 100次并发更新 < 5s

## 错误处理测试

### 测试各种错误场景

1. 无效的商品ID
2. 无效的SKU编码
3. 负数库存
4. 非数字库存
5. 不支持的操作类型
6. 数据库连接失败

## 注意事项

1. 测试前备份数据库
2. 使用测试环境，不要在生产环境测试
3. 测试完成后恢复数据
4. 记录测试结果和问题
