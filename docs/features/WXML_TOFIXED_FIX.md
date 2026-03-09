# WXML .toFixed() 错误修复

## 问题描述

WXML 编译错误：
```
Bad value with message: unexpected token `.`
```

错误位置：
- `miniprogram/pages/order/confirm/confirm.wxml:8:58`
- `miniprogram/pages/order/detail/detail.wxml`
- `pages/order/detail/detail.wxml`

---

## 问题原因

WXML 不支持直接调用 JavaScript 方法，包括 `.toFixed()`。

### 错误示例
```xml
<!-- ❌ 错误：WXML 中不能使用 .toFixed() -->
<text>¥{{(price / 100).toFixed(2)}}</text>
```

---

## 解决方案

在 JS 文件中预先格式化数据，然后在 WXML 中直接使用格式化后的值。

### 正确做法

#### 1. 在 JS 中格式化
```javascript
Page({
  data: {
    price: 29800,
    formattedPrice: ''
  },
  
  onLoad() {
    this.setData({
      formattedPrice: (this.data.price / 100).toFixed(2)
    })
  }
})
```

#### 2. 在 WXML 中使用
```xml
<!-- ✅ 正确：直接使用格式化后的值 -->
<text>¥{{formattedPrice}}</text>
```

---

## 已修复的文件

### 1. miniprogram/pages/order/confirm/confirm.wxml

#### 修复前
```xml
<text class="price-value member-discount">-¥{{(memberDiscount / 100).toFixed(2)}}</text>
<text class="price-value discount">-¥{{(discountAmount / 100).toFixed(2)}}</text>
<text class="submit-amount">¥{{(payAmount / 100).toFixed(2)}}</text>
```

#### 修复后
```xml
<text class="price-value member-discount">-¥{{formattedMemberDiscount}}</text>
<text class="price-value discount">-¥{{formattedDiscountAmount}}</text>
<text class="submit-amount">¥{{formattedPayAmount}}</text>
```

#### JS 中的格式化代码
```javascript
calculatePrice() {
  // ... 计算逻辑
  
  this.setData({
    totalAmount,
    memberDiscount,
    discountAmount: couponDiscount,
    payAmount,
    // 格式化的价格字符串
    formattedTotalAmount: (totalAmount / 100).toFixed(2),
    formattedMemberDiscount: (memberDiscount / 100).toFixed(2),
    formattedDiscountAmount: (couponDiscount / 100).toFixed(2),
    formattedPayAmount: (payAmount / 100).toFixed(2)
  })
}
```

---

### 2. miniprogram/pages/order/detail/detail.wxml

#### 修复前
```xml
<text class="value discount">-¥{{(order.discountAmount / 100).toFixed(2)}}</text>
<text class="value">¥{{(order.payAmount / 100).toFixed(2)}}</text>
```

#### 修复后
```xml
<text class="value discount">-¥{{order.discountAmountText}}</text>
<text class="value">¥{{order.payAmountText}}</text>
```

#### JS 中的格式化代码
```javascript
formatOrderData(order) {
  return {
    ...order,
    totalAmountText: this.formatPrice(order.totalAmount),
    discountAmountText: this.formatPrice(order.discountAmount),
    payAmountText: this.formatPrice(order.payAmount),
    items: order.items.map(item => ({
      ...item,
      priceText: this.formatPrice(item.price)
    }))
  }
}

formatPrice(price) {
  return (price / 100).toFixed(2)
}
```

---

### 3. pages/order/detail/detail.wxml

同样的修复应用到根目录的文件。

---

## WXML 限制说明

### 不支持的操作

WXML 中不能使用以下 JavaScript 特性：

#### 1. 方法调用
```xml
<!-- ❌ 不支持 -->
<text>{{str.toUpperCase()}}</text>
<text>{{num.toFixed(2)}}</text>
<text>{{arr.join(', ')}}</text>
```

#### 2. 复杂表达式
```xml
<!-- ❌ 不支持 -->
<text>{{price > 100 ? '贵' : '便宜'}}</text>
<text>{{items.filter(item => item.selected).length}}</text>
```

#### 3. 对象/数组方法
```xml
<!-- ❌ 不支持 -->
<text>{{Object.keys(obj).length}}</text>
<text>{{Array.isArray(data)}}</text>
```

### 支持的操作

#### 1. 简单运算
```xml
<!-- ✅ 支持 -->
<text>{{price + 10}}</text>
<text>{{count * 2}}</text>
<text>{{total - discount}}</text>
```

#### 2. 属性访问
```xml
<!-- ✅ 支持 -->
<text>{{user.name}}</text>
<text>{{items[0].title}}</text>
```

#### 3. 简单比较
```xml
<!-- ✅ 支持 -->
<view wx:if="{{price > 100}}">贵</view>
<view wx:if="{{status === 1}}">已支付</view>
```

---

## 最佳实践

### 1. 数据预处理
在 JS 中完成所有数据格式化和计算：

```javascript
Page({
  data: {
    products: []
  },
  
  loadProducts() {
    const rawProducts = [/* 原始数据 */]
    
    // 预处理数据
    const products = rawProducts.map(product => ({
      ...product,
      // 格式化价格
      priceText: (product.price / 100).toFixed(2),
      // 格式化日期
      dateText: this.formatDate(product.createTime),
      // 计算折扣
      discountText: product.discount ? `${product.discount}折` : '无折扣'
    }))
    
    this.setData({ products })
  }
})
```

### 2. 使用 WXS
对于需要在 WXML 中进行的简单格式化，可以使用 WXS：

```xml
<!-- 定义 WXS 模块 -->
<wxs module="utils">
  function formatPrice(price) {
    return (price / 100).toFixed(2)
  }
  
  module.exports = {
    formatPrice: formatPrice
  }
</wxs>

<!-- 使用 WXS 函数 -->
<text>¥{{utils.formatPrice(price)}}</text>
```

### 3. 创建工具函数
在 `utils/util.js` 中创建通用格式化函数：

```javascript
// utils/util.js
function formatPrice(price) {
  return (price / 100).toFixed(2)
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

module.exports = {
  formatPrice,
  formatDate
}
```

在页面中使用：

```javascript
const { formatPrice, formatDate } = require('../../utils/util.js')

Page({
  data: {
    priceText: ''
  },
  
  onLoad() {
    this.setData({
      priceText: formatPrice(29800)
    })
  }
})
```

---

## 验证修复

### 1. 编译检查
- ✅ 无 WXML 编译错误
- ✅ 控制台无红色错误信息

### 2. 功能测试
- ✅ 订单确认页面价格显示正常
- ✅ 订单详情页面价格显示正常
- ✅ 所有价格格式为两位小数

### 3. 页面测试
- 订单确认页面：`/pages/order/confirm/confirm`
- 订单详情页面：`/pages/order/detail/detail`

---

## 总结

### 修复内容
- ✅ 修复了 3 个文件中的 `.toFixed()` 错误
- ✅ 在 JS 中预先格式化所有价格数据
- ✅ WXML 中直接使用格式化后的值

### 关键要点
1. WXML 不支持 JavaScript 方法调用
2. 所有数据格式化应在 JS 中完成
3. 使用描述性的字段名（如 `formattedPrice`）
4. 可以使用 WXS 进行简单的格式化

### 预防措施
- 在编写 WXML 时避免使用任何 JavaScript 方法
- 养成在 JS 中预处理数据的习惯
- 使用工具函数统一格式化逻辑
- 定期检查 WXML 文件中的复杂表达式

---

**所有 .toFixed() 错误已修复！** ✅
