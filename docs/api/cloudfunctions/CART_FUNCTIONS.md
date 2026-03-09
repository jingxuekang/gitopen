# 购物车云函数说明文档

## 概述

本文档描述了购物车功能的四个云函数实现，包括添加商品、获取购物车、更新商品和删除商品。

## 云函数列表

### 1. addToCart - 添加商品到购物车

**功能描述：**
- 添加商品到购物车
- 支持商品去重（同一用户、同一商品、同一SKU只保留一条记录）
- 重复添加时自动累加数量
- 验证库存是否充足

**请求参数：**
```javascript
{
  productId: String,  // 商品ID（必需）
  skuCode: String,    // SKU编码（必需）
  quantity: Number    // 数量（可选，默认为1）
}
```

**返回数据：**
```javascript
{
  code: 0,
  message: '添加到购物车成功',
  data: {
    cartItemId: String,  // 购物车商品ID
    quantity: Number     // 当前数量
  }
}
```

**业务逻辑：**
1. 验证参数（productId、skuCode、quantity）
2. 检查商品是否存在
3. 检查SKU是否存在
4. 检查库存是否充足
5. 查询购物车中是否已存在该商品（userId + productId + skuCode）
6. 如果已存在：
   - 累加数量
   - 检查累加后的数量是否超过库存
   - 更新购物车记录
7. 如果不存在：
   - 创建新的购物车记录
   - 默认设置为选中状态（selected: true）

**错误处理：**
- 400: 参数错误（缺少必需参数或数量无效）
- 404: 商品不存在或SKU不存在
- 409: 库存不足

---

### 2. getCart - 获取购物车列表

**功能描述：**
- 获取当前用户的购物车列表
- 关联查询商品信息
- 计算购物车总价
- 标记库存不足的商品

**请求参数：**
无需参数（自动获取当前用户的OPENID）

**返回数据：**
```javascript
{
  code: 0,
  message: '获取购物车成功',
  data: {
    items: [
      {
        _id: String,           // 购物车商品ID
        userId: String,        // 用户ID
        productId: String,     // 商品ID
        skuCode: String,       // SKU编码
        quantity: Number,      // 数量
        selected: Boolean,     // 是否选中
        productName: String,   // 商品名称
        productImage: String,  // 商品图片
        price: Number,         // 单价（分）
        stock: Number,         // 库存
        specText: String,      // 规格文本
        available: Boolean,    // 是否可用（库存充足）
        subtotal: Number,      // 小计（分）
        createdAt: Date,
        updatedAt: Date
      }
    ],
    totalPrice: Number,    // 总价（分，只计算选中且可用的商品）
    selectedCount: Number  // 选中商品数量
  }
}
```

**业务逻辑：**
1. 查询当前用户的所有购物车商品
2. 提取所有商品ID，批量查询商品信息
3. 遍历购物车商品，关联商品信息：
   - 查找对应的SKU
   - 生成规格文本（specValues拼接）
   - 检查库存是否充足（available = stock >= quantity）
   - 计算小计（subtotal = price × quantity）
4. 计算总价（只计算selected=true且available=true的商品）
5. 计算选中商品数量

**特殊处理：**
- 商品已下架：显示"商品已下架"，available=false
- SKU已失效：显示"规格已失效"，available=false
- 库存不足：available=false，禁止结算

---

### 3. updateCartItem - 更新购物车商品

**功能描述：**
- 更新购物车商品的数量
- 更新购物车商品的选中状态
- 验证库存是否充足

**请求参数：**
```javascript
{
  cartItemId: String,  // 购物车商品ID（必需）
  quantity: Number,    // 新数量（可选）
  selected: Boolean    // 选中状态（可选）
}
```

**返回数据：**
```javascript
{
  code: 0,
  message: '更新成功',
  data: {
    cartItemId: String,
    quantity: Number,    // 如果更新了数量
    selected: Boolean,   // 如果更新了选中状态
    updatedAt: Date
  }
}
```

**业务逻辑：**
1. 验证参数（cartItemId必需）
2. 查询购物车商品是否存在
3. 验证权限（只能更新自己的购物车商品）
4. 如果更新数量：
   - 验证数量必须大于0
   - 查询商品信息
   - 查找对应的SKU
   - 检查库存是否充足
5. 如果更新选中状态：
   - 直接更新
6. 更新购物车记录

**错误处理：**
- 400: 参数错误（缺少cartItemId或数量无效）
- 403: 无权限操作（不是自己的购物车商品）
- 404: 购物车商品不存在或SKU不存在
- 409: 库存不足

---

### 4. deleteCartItem - 删除购物车商品

**功能描述：**
- 删除单个购物车商品
- 批量删除购物车商品
- 验证权限

**请求参数：**
```javascript
// 单个删除
{
  cartItemId: String  // 购物车商品ID
}

// 批量删除
{
  cartItemIds: [String]  // 购物车商品ID数组
}
```

**返回数据：**
```javascript
// 单个删除
{
  code: 0,
  message: '删除成功'
}

// 批量删除
{
  code: 0,
  message: '批量删除成功',
  data: {
    deletedCount: Number  // 删除的数量
  }
}
```

**业务逻辑：**
1. 判断是单个删除还是批量删除
2. 批量删除：
   - 验证所有商品都属于当前用户
   - 使用Promise.all并发删除
3. 单个删除：
   - 查询购物车商品是否存在
   - 验证权限
   - 删除记录

**错误处理：**
- 400: 参数错误（未提供cartItemId或cartItemIds）
- 403: 无权限操作（部分或全部商品不属于当前用户）
- 404: 购物车商品不存在

---

## 购物车总价计算逻辑

购物车总价的计算遵循以下规则：

```javascript
totalPrice = items
  .filter(item => item.selected && item.available)
  .reduce((sum, item) => sum + item.price * item.quantity, 0)
```

**计算规则：**
1. 只计算选中的商品（selected = true）
2. 只计算可用的商品（available = true，即库存充足）
3. 每个商品的小计 = 单价 × 数量
4. 总价 = 所有符合条件商品的小计之和

**验证需求：**
- 需求 5.4：实时更新总价
- 属性 1：购物车总价一致性

---

## 购物车商品去重逻辑

购物车商品的唯一性由以下三个字段组合决定：
- userId（用户ID）
- productId（商品ID）
- skuCode（SKU编码）

**去重规则：**
1. 同一用户、同一商品、同一SKU只保留一条记录
2. 重复添加时，累加数量而不是创建新记录
3. 同一商品的不同SKU视为不同的购物车商品

**验证需求：**
- 需求 5.2：商品已在购物车中时增加数量
- 属性 8：购物车商品去重

---

## 数据库索引

为了提高查询性能，cart_items集合应该创建以下索引：

```javascript
// 用户索引（用于查询用户的购物车）
db.collection('cart_items').createIndex({
  keys: { userId: 1 }
})

// 唯一性索引（用于去重）
db.collection('cart_items').createIndex({
  keys: { userId: 1, productId: 1, skuCode: 1 },
  unique: true
})
```

---

## 测试覆盖

单元测试覆盖以下场景：

**addToCart:**
- ✓ 成功添加新商品到购物车
- ✓ 商品已存在时累加数量
- ✓ 库存不足时返回错误
- ✓ 验证必需参数

**getCart:**
- ✓ 正确计算购物车总价
- ✓ 只计算选中且可用商品的总价
- ✓ 正确标记库存不足的商品
- ✓ 返回空购物车

**updateCartItem:**
- ✓ 成功更新商品数量
- ✓ 成功更新选中状态
- ✓ 数量超过库存时返回错误
- ✓ 拒绝无效的数量

**deleteCartItem:**
- ✓ 成功删除单个商品
- ✓ 成功批量删除商品

**购物车总价计算逻辑:**
- ✓ 正确计算多个商品的总价
- ✓ 处理空购物车
- ✓ 处理全部未选中的情况
- ✓ 处理全部不可用的情况

**购物车商品去重逻辑:**
- ✓ 检测重复的商品和SKU组合
- ✓ 允许同一商品的不同SKU

---

## 部署说明

1. 在微信开发者工具中打开项目
2. 右键点击每个云函数文件夹，选择"上传并部署：云端安装依赖"
3. 等待部署完成
4. 在云开发控制台验证云函数是否部署成功

**需要部署的云函数：**
- addToCart
- getCart
- updateCartItem
- deleteCartItem

---

## 调用示例

### 前端调用示例

```javascript
// 添加商品到购物车
wx.cloud.callFunction({
  name: 'addToCart',
  data: {
    productId: 'product_001',
    skuCode: 'SKU_001',
    quantity: 2
  }
}).then(res => {
  console.log('添加成功', res.result)
})

// 获取购物车
wx.cloud.callFunction({
  name: 'getCart'
}).then(res => {
  console.log('购物车数据', res.result.data)
})

// 更新购物车商品数量
wx.cloud.callFunction({
  name: 'updateCartItem',
  data: {
    cartItemId: 'cart_item_001',
    quantity: 5
  }
}).then(res => {
  console.log('更新成功', res.result)
})

// 更新购物车商品选中状态
wx.cloud.callFunction({
  name: 'updateCartItem',
  data: {
    cartItemId: 'cart_item_001',
    selected: false
  }
}).then(res => {
  console.log('更新成功', res.result)
})

// 删除单个购物车商品
wx.cloud.callFunction({
  name: 'deleteCartItem',
  data: {
    cartItemId: 'cart_item_001'
  }
}).then(res => {
  console.log('删除成功', res.result)
})

// 批量删除购物车商品
wx.cloud.callFunction({
  name: 'deleteCartItem',
  data: {
    cartItemIds: ['cart_item_001', 'cart_item_002', 'cart_item_003']
  }
}).then(res => {
  console.log('批量删除成功', res.result)
})
```

---

## 注意事项

1. **金额单位**：所有金额使用"分"为单位，避免浮点数精度问题
2. **库存验证**：添加和更新数量时都需要验证库存
3. **权限验证**：更新和删除操作需要验证用户权限
4. **去重逻辑**：通过userId + productId + skuCode组合实现去重
5. **总价计算**：只计算选中且可用的商品
6. **批量操作**：批量删除使用Promise.all提高性能
7. **错误处理**：统一的错误码和错误消息格式
8. **数据一致性**：通过数据库索引保证唯一性约束

---

## 相关需求

- 需求 5.1：添加商品到购物车
- 需求 5.2：商品已在购物车中时增加数量
- 需求 5.3：显示购物车商品列表
- 需求 5.4：实时更新总价
- 需求 5.5：删除购物车商品
- 需求 5.6：标记库存不足的商品
- 需求 5.7：批量选择和删除

## 相关属性

- 属性 1：购物车总价一致性
- 属性 8：购物车商品去重
