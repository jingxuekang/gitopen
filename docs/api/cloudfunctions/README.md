# 云函数说明

## 云函数列表

### 用户相关
- **login**: 用户登录，处理微信授权
- **getUserInfo**: 获取用户信息
- **updateUserInfo**: 更新用户信息

### 商品相关
- **getHomeData**: 获取首页数据（轮播图、推荐商品）
- **getProducts**: 获取商品列表（支持分类、搜索、分页）
- **getProductDetail**: 获取商品详情
- **searchProducts**: 搜索商品
- **getReviews**: 获取商品评价

### 购物车相关
- **getCart**: 获取购物车
- **addToCart**: 添加商品到购物车
- **updateCartItem**: 更新购物车商品数量
- **deleteCartItem**: 删除购物车商品
- **clearCart**: 清空购物车

### 地址相关
- **getAddresses**: 获取地址列表
- **addAddress**: 添加收货地址
- **updateAddress**: 更新收货地址
- **deleteAddress**: 删除收货地址

### 订单相关
- **createOrder**: 创建订单
- **getOrders**: 获取订单列表
- **getOrderDetail**: 获取订单详情
- **cancelOrder**: 取消订单
- **confirmOrder**: 确认收货
- **getLogistics**: 获取物流信息
- **checkExpiredOrders**: 定时检查超时订单（定时触发器）

### 支付相关
- **createPayment**: 创建支付订单
- **paymentNotify**: 支付回调通知
- **getPaymentStatus**: 查询支付状态

### 评价相关
- **submitReview**: 提交商品评价

### 收藏相关
- **addFavorite**: 添加收藏
- **removeFavorite**: 取消收藏
- **getFavorites**: 获取收藏列表

### 优惠券相关
- **getCoupons**: 获取优惠券列表
- **claimCoupon**: 领取优惠券
- **getUserCoupons**: 获取用户优惠券
- **getAvailableCoupons**: 获取订单可用优惠券

### 拼团相关
- **getGroupActivities**: 获取拼团活动列表
- **getGroupDetail**: 获取拼团详情
- **createGroup**: 发起拼团
- **joinGroup**: 参与拼团
- **checkExpiredGroups**: 定时检查过期拼团（定时触发器）

### 会员相关
- **updateMemberLevel**: 更新会员等级

### 其他
- **database-init**: 数据库初始化
- **getStatistics**: 获取数据统计
- **updateStock**: 更新商品库存
- **updateLogistics**: 更新物流信息

## 云函数开发规范

### 1. 统一返回格式

```javascript
// 成功
{
  code: 0,
  message: '成功',
  data: {}
}

// 失败
{
  code: -1,
  message: '错误信息',
  error: {}
}
```

### 2. 错误处理

```javascript
try {
  // 业务逻辑
  return {
    code: 0,
    data: result
  }
} catch (err) {
  console.error(err)
  return {
    code: -1,
    message: err.message
  }
}
```

### 3. 权限验证

```javascript
const { OPENID } = cloud.getWXContext()
if (!OPENID) {
  return {
    code: 401,
    message: '未授权'
  }
}
```

### 4. 参数验证

```javascript
if (!event.productId) {
  return {
    code: 400,
    message: '缺少必要参数'
  }
}
```

### 5. 数据库操作

```javascript
const db = cloud.database()
const _ = db.command

// 查询
const result = await db.collection('products')
  .where({ status: 1 })
  .limit(20)
  .get()

// 添加
await db.collection('products').add({
  data: productData
})

// 更新
await db.collection('products')
  .doc(productId)
  .update({
    data: { stock: _.inc(-1) }
  })

// 删除
await db.collection('products')
  .doc(productId)
  .remove()
```

## 部署步骤

1. 在微信开发者工具中右键云函数目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

## 定时触发器配置

在云开发控制台中配置定时触发器：

- **checkExpiredOrders**: 每5分钟执行一次，检查超时未支付订单
  - Cron表达式: `0 */5 * * * * *`
  
- **checkExpiredGroups**: 每10分钟执行一次，检查过期拼团
  - Cron表达式: `0 */10 * * * * *`

## 注意事项

1. 云函数超时时间默认为20秒，可在配置中调整
2. 云函数内存默认为256MB，可根据需要调整
3. 敏感操作需要进行权限验证
4. 数据库操作需要处理并发问题
5. 定期查看云函数日志，及时发现问题
