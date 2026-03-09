# 库存管理功能实现文档

## 概述

本文档描述了茶叶电商小程序的库存管理功能实现，包括库存更新、缺货状态显示和库存预警机制。

## 功能列表

### 1. 库存更新云函数 (updateStock)

管理员可以通过此云函数更新商品库存。

**功能特性：**
- 支持按SKU更新库存
- 支持批量更新所有SKU库存
- 支持三种操作类型：set（设置）、increase（增加）、decrease（减少）
- 自动检测库存预警
- 返回库存变更前后的数据

**调用示例：**

```javascript
// 设置指定SKU的库存
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'product_id',
    skuCode: 'sku_001',
    stock: 50,
    operation: 'set'
  }
})

// 增加指定SKU的库存
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'product_id',
    skuCode: 'sku_001',
    stock: 20,
    operation: 'increase'
  }
})

// 减少指定SKU的库存
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'product_id',
    skuCode: 'sku_001',
    stock: 10,
    operation: 'decrease'
  }
})

// 批量设置所有SKU的库存（平均分配）
wx.cloud.callFunction({
  name: 'updateStock',
  data: {
    productId: 'product_id',
    stock: 100,
    operation: 'set'
  }
})
```

**返回数据：**

```javascript
{
  success: true,
  data: {
    productId: 'product_id',
    skuCode: 'sku_001',
    oldStock: 30,
    newStock: 50,
    warnings: [
      {
        type: 'low_stock',
        message: 'SKU sku_001 库存不足，当前库存：8',
        skuCode: 'sku_001',
        stock: 8
      }
    ]
  },
  message: '库存更新成功'
}
```

### 2. 库存预警查询云函数 (getStockWarnings)

管理员可以查询所有需要补货的商品。

**功能特性：**
- 自动扫描所有上架商品
- 检测缺货商品（库存为0）
- 检测库存不足商品（库存≤10）
- 按优先级和库存数量排序
- 提供统计信息

**调用示例：**

```javascript
// 获取所有库存预警
wx.cloud.callFunction({
  name: 'getStockWarnings',
  data: {
    warningType: 'all' // all, out_of_stock, low_stock
  }
})

// 只获取缺货商品
wx.cloud.callFunction({
  name: 'getStockWarnings',
  data: {
    warningType: 'out_of_stock'
  }
})

// 只获取库存不足商品
wx.cloud.callFunction({
  name: 'getStockWarnings',
  data: {
    warningType: 'low_stock'
  }
})
```

**返回数据：**

```javascript
{
  success: true,
  data: {
    warnings: [
      {
        productId: 'product_id',
        productName: '西湖龙井',
        productImage: 'https://...',
        skuCode: 'sku_001',
        specText: '250g 礼盒装',
        stock: 0,
        type: 'out_of_stock',
        message: '已缺货',
        priority: 1
      },
      {
        productId: 'product_id_2',
        productName: '铁观音',
        productImage: 'https://...',
        skuCode: 'sku_002',
        specText: '500g 散装',
        stock: 5,
        type: 'low_stock',
        message: '库存不足，仅剩5件',
        priority: 2
      }
    ],
    stats: {
      total: 15,
      outOfStock: 5,
      lowStock: 10
    }
  },
  message: '获取库存预警成功'
}
```

### 3. 前端库存状态显示

在商品详情页自动显示库存状态。

**功能特性：**
- 实时显示库存数量
- 缺货时显示红色警告条
- 库存不足时显示橙色提示条
- 缺货时禁用购买按钮
- SKU选择器中标记缺货规格

**工具函数：**

```javascript
// 检查库存状态
const { checkStockStatus } = require('../../utils/util.js')

const stockStatus = checkStockStatus(product, skuCode)
// 返回：
// {
//   inStock: true/false,
//   stock: 50,
//   status: 'in_stock' / 'low_stock' / 'out_of_stock'
// }

// 获取库存状态文本
const { getStockStatusText } = require('../../utils/util.js')

const statusText = getStockStatusText('out_of_stock')
// 返回：'缺货'

// 检查是否需要库存预警
const { needStockWarning } = require('../../utils/util.js')

const needWarning = needStockWarning(8) // 默认阈值10
// 返回：true
```

## 库存预警阈值

当前库存预警阈值设置为 **10件**。

- 库存 = 0：缺货状态（out_of_stock）
- 0 < 库存 ≤ 10：库存不足状态（low_stock）
- 库存 > 10：正常状态（in_stock）

可以在以下文件中修改阈值：
- `cloudfunctions/updateStock/index.js` - 第9行
- `cloudfunctions/getStockWarnings/index.js` - 第9行
- `miniprogram/utils/util.js` - needStockWarning函数

## 库存管理流程

### 订单创建时
1. 验证库存是否充足
2. 锁定库存（扣减可用库存）
3. 如果库存不足，阻止订单创建

### 支付成功后
1. 扣减实际库存
2. 订单状态更新为已支付

### 订单取消时
1. 释放锁定的库存
2. 恢复可用库存

### 订单超时未支付
1. 自动取消订单
2. 释放锁定的库存

## 数据库结构

### 商品表 (products)

```javascript
{
  _id: ObjectId,
  name: String,
  stock: Number,  // 无SKU商品的总库存
  skus: [{
    skuCode: String,
    specValues: [String],
    price: Number,
    stock: Number  // SKU库存
  }],
  status: Number,  // 0-下架 1-上架
  // ... 其他字段
}
```

## 权限控制

库存管理功能应该只对管理员开放。建议实现方式：

1. 在用户表中添加 `role` 字段标识管理员
2. 在云函数中验证用户角色
3. 只有管理员可以调用 updateStock 和 getStockWarnings

示例代码：

```javascript
// 在云函数中验证管理员权限
const wxContext = cloud.getWXContext()
const userId = wxContext.OPENID

// 查询用户信息
const userResult = await db.collection('users')
  .where({ openid: userId })
  .get()

if (!userResult.data[0] || userResult.data[0].role !== 'admin') {
  return {
    success: false,
    message: '无权限访问'
  }
}
```

## 测试建议

### 单元测试
- 测试库存更新的三种操作类型
- 测试库存不能为负数
- 测试批量更新库存的平均分配逻辑
- 测试库存预警的阈值判断

### 集成测试
- 测试订单创建时的库存锁定
- 测试支付成功后的库存扣减
- 测试订单取消后的库存释放
- 测试超时订单的库存恢复

### 属性测试
- 验证库存一致性（锁定、扣减、释放）
- 验证库存不会超卖
- 验证库存预警的准确性

## 未来优化方向

1. **库存预警通知**
   - 当库存低于阈值时，自动发送通知给管理员
   - 支持微信模板消息或企业微信通知

2. **库存历史记录**
   - 记录每次库存变更的操作日志
   - 包括操作人、操作时间、变更原因等

3. **自动补货建议**
   - 基于销售数据分析
   - 预测未来库存需求
   - 提供补货建议

4. **库存预留**
   - 支持为营销活动预留库存
   - 防止活动期间库存被普通订单占用

5. **多仓库管理**
   - 支持多个仓库的库存管理
   - 根据用户地址选择最近的仓库发货

## 相关文件

- `cloudfunctions/updateStock/index.js` - 库存更新云函数
- `cloudfunctions/getStockWarnings/index.js` - 库存预警查询云函数
- `miniprogram/utils/util.js` - 库存相关工具函数
- `miniprogram/pages/product/product.js` - 商品详情页（库存状态显示）
- `miniprogram/pages/product/product.wxml` - 商品详情页模板
- `miniprogram/pages/product/product.wxss` - 商品详情页样式

## 需求映射

本实现满足以下需求：

- **需求 19.4**：WHEN 商品库存为0，THE 小程序系统 SHALL 在商品详情页显示缺货状态并禁止购买
- **需求 19.5**：THE 小程序系统 SHALL 支持管理员在后台修改商品库存数量

## 验收标准

- ✅ 管理员可以更新商品库存
- ✅ 支持按SKU更新库存
- ✅ 支持批量更新库存
- ✅ 库存为0时显示缺货状态
- ✅ 缺货时禁止购买
- ✅ 库存不足时显示预警提示
- ✅ 提供库存预警查询接口
- ✅ 按优先级排序预警列表
