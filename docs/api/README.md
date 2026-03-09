# 云函数 API 文档

## 返回结构约定

所有云函数统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code = 0` 表示成功
- `code != 0` 表示失败，`message` 为错误提示

## 云函数清单

### 用户模块
- `login`
- `getUserInfo`
- `getUserProfile`
- `updateUserInfo`
- `updateMemberLevel`

### 商品模块
- `getHomeData`
- `getProducts`
- `getProductDetail`
- `searchProducts`
- `getReviews`

### 购物车模块
- `getCart`
- `addToCart`
- `updateCartItem`
- `deleteCartItem`

### 地址模块
- `getAddresses`
- `addAddress`
- `updateAddress`
- `deleteAddress`

### 订单模块
- `createOrder`
- `getOrders`
- `getOrderDetail`
- `cancelOrder`
- `confirmReceipt`
- `updateLogistics`

### 支付模块
- `createPayment`
- `paymentNotify`

### 评价模块
- `submitReview`

### 收藏模块
- `addFavorite`
- `removeFavorite`
- `getFavorites`

### 优惠券模块
- `getCoupons`
- `claimCoupon`
- `getUserCoupons`
- `getAvailableCoupons`

### 拼团模块
- `getGroupActivities`
- `getGroupDetail`
- `createGroup`
- `joinGroup`
- `checkExpiredGroups`

### 库存与统计
- `updateStock`
- `getStockWarnings`
- `getStatistics`

### 定时任务
- `checkExpiredOrders`

## 前端调用示例

```javascript
const { productApi, cartApi } = require('../../utils/api')

async function loadProducts() {
  const res = await productApi.getProducts({ page: 1, pageSize: 10 })
  return res.list || []
}

async function addCart(productId, skuCode, quantity) {
  return cartApi.addToCart({ productId, skuCode, quantity })
}
```

## 常见错误码

| code | 含义 | 建议处理 |
| --- | --- | --- |
| 400 | 参数错误 | 校验入参后重试 |
| 401 | 未登录 | 跳转登录页 |
| 404 | 资源不存在 | 提示用户并刷新数据 |
| 409 | 资源冲突（库存不足） | 提示修改数量 |
| 500 | 系统异常 | 提示稍后重试并上报日志 |
| 504 | 请求超时 | 触发重试机制 |

更多历史说明请查看 [cloudfunctions 文档目录](cloudfunctions)。
