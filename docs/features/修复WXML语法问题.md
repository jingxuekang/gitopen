# WXML 语法问题修复清单

## 问题说明
WXML 不支持 JavaScript 方法调用（如 `.toFixed()`），需要在 JS 文件中预先格式化数据。

## 已修复的文件
- ✅ miniprogram/pages/order/confirm/confirm.wxml + confirm.js
- ✅ miniprogram/pages/coupon/select/select.wxml + select.js
- ✅ pages/cart/cart.wxss (按钮样式)

## 待修复的文件列表

### 1. miniprogram/pages/user/favorite/favorite.wxml
**问题行：**
```xml
<text class="product-price">¥{{(item.productInfo.price / 100).toFixed(2)}}</text>
```

**修复方案：**
在 `miniprogram/pages/user/favorite/favorite.js` 的数据加载方法中添加：
```javascript
const formattedItems = items.map(item => ({
  ...item,
  formattedPrice: (item.productInfo.price / 100).toFixed(2)
}))
```

WXML 改为：
```xml
<text class="product-price">¥{{item.formattedPrice}}</text>
```

---

### 2. miniprogram/pages/user/coupon/coupon.wxml
**问题行：**
```xml
<text class="coupon-condition">满{{(item.couponInfo.minAmount / 100).toFixed(0)}}元可用</text>
```

**修复方案：**
在 `miniprogram/pages/user/coupon/coupon.js` 的数据加载方法中添加：
```javascript
const formattedCoupons = coupons.map(coupon => ({
  ...coupon,
  formattedMinAmount: Math.floor(coupon.couponInfo.minAmount / 100)
}))
```

WXML 改为：
```xml
<text class="coupon-condition">满{{item.formattedMinAmount}}元可用</text>
```

---

### 3. miniprogram/pages/payment/payment.wxml
**问题行：**
```xml
<view class="amount-value">¥{{(payAmount / 100).toFixed(2)}}</view>
<text class="goods-price">¥{{(item.price / 100).toFixed(2)}}</text>
```

**修复方案：**
在 `miniprogram/pages/payment/payment.js` 中添加格式化：
```javascript
this.setData({
  payAmount: amount,
  formattedPayAmount: (amount / 100).toFixed(2),
  items: items.map(item => ({
    ...item,
    formattedPrice: (item.price / 100).toFixed(2)
  }))
})
```

WXML 改为：
```xml
<view class="amount-value">¥{{formattedPayAmount}}</view>
<text class="goods-price">¥{{item.formattedPrice}}</text>
```

---

### 4. miniprogram/pages/order/list/list.wxml
**问题行：**
```xml
<text class="goods-price">¥{{(goods.price / 100).toFixed(2)}}</text>
<text class="amount-value">¥{{(item.payAmount / 100).toFixed(2)}}</text>
```

**修复方案：**
在 `miniprogram/pages/order/list/list.js` 的订单加载方法中：
```javascript
const formattedOrders = orders.map(order => ({
  ...order,
  formattedPayAmount: (order.payAmount / 100).toFixed(2),
  items: order.items.map(item => ({
    ...item,
    formattedPrice: (item.price / 100).toFixed(2)
  }))
}))
```

WXML 改为：
```xml
<text class="goods-price">¥{{goods.formattedPrice}}</text>
<text class="amount-value">¥{{item.formattedPayAmount}}</text>
```

---

### 5. miniprogram/pages/order/detail/detail.wxml
**问题行：**
```xml
<text class="goods-price">¥{{(item.price / 100).toFixed(2)}}</text>
<text class="value">¥{{(order.totalAmount / 100).toFixed(2)}}</text>
<text class="value discount">-¥{{(order.discountAmount / 100).toFixed(2)}}</text>
<text class="value">¥{{(order.payAmount / 100).toFixed(2)}}</text>
```

**修复方案：**
在 `miniprogram/pages/order/detail/detail.js` 的订单加载方法中：
```javascript
this.setData({
  order: {
    ...orderData,
    formattedTotalAmount: (orderData.totalAmount / 100).toFixed(2),
    formattedDiscountAmount: (orderData.discountAmount / 100).toFixed(2),
    formattedPayAmount: (orderData.payAmount / 100).toFixed(2),
    items: orderData.items.map(item => ({
      ...item,
      formattedPrice: (item.price / 100).toFixed(2)
    }))
  }
})
```

WXML 改为：
```xml
<text class="goods-price">¥{{item.formattedPrice}}</text>
<text class="value">¥{{order.formattedTotalAmount}}</text>
<text class="value discount">-¥{{order.formattedDiscountAmount}}</text>
<text class="value">¥{{order.formattedPayAmount}}</text>
```

---

### 6. pages/order/detail/detail.wxml
同上，需要修复 `pages/order/detail/detail.js` 和对应的 WXML 文件。

---

## 修复优先级
1. 高优先级（影响主流程）：
   - payment.wxml (支付页面)
   - order/detail/detail.wxml (订单详情)
   - order/list/list.wxml (订单列表)

2. 中优先级（用户中心功能）：
   - user/favorite/favorite.wxml (收藏)
   - user/coupon/coupon.wxml (优惠券)

## 通用修复模式

1. 在 JS 文件的数据加载/设置方法中添加格式化逻辑
2. 使用 `map()` 方法为数组中的每个对象添加格式化字段
3. 在 WXML 中使用格式化后的字段名
4. 格式化字段命名规范：`formatted + 原字段名首字母大写`

例如：
- `price` → `formattedPrice`
- `payAmount` → `formattedPayAmount`
- `totalAmount` → `formattedTotalAmount`
