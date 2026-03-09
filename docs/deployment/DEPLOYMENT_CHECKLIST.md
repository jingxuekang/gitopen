# 微信小程序部署检查清单

## ⚠️ 当前状态：需要配置才能运行

虽然所有功能代码已经实现，但在部署到微信小程序之前，还需要完成以下配置和准备工作：

---

## 📋 必须完成的配置项

### 1. 微信小程序基础配置

#### ✅ 已完成
- [x] 项目代码结构完整
- [x] 所有页面已创建
- [x] 所有云函数已实现
- [x] 组件和工具函数已实现

#### ❌ 需要配置

**1.1 注册微信小程序**
- [ ] 在微信公众平台注册小程序账号
- [ ] 获取小程序 AppID
- [ ] 完成小程序认证（需要营业执照）

**1.2 修改 project.config.json**
```json
{
  "appid": "your-appid"  // 替换为你的小程序 AppID
}
```
📍 文件位置：`project.config.json` 第 38 行

**1.3 开通微信支付**
- [ ] 申请微信支付商户号
- [ ] 配置支付密钥和证书
- [ ] 在云函数中配置支付参数

---

### 2. 云开发环境配置

**2.1 开通云开发**
- [ ] 在微信开发者工具中开通云开发
- [ ] 创建云开发环境（建议创建两个：开发环境和生产环境）
- [ ] 获取云环境 ID

**2.2 修改 app.js 云环境配置**
```javascript
wx.cloud.init({
  env: 'your-env-id',  // 替换为你的云环境 ID
  traceUser: true,
})
```
📍 文件位置：`miniprogram/app.js` 第 8 行

**2.3 创建云数据库集合**

需要创建以下集合（在云开发控制台 → 数据库中创建）：

```
✓ users              - 用户信息
✓ products           - 商品信息
✓ addresses          - 收货地址
✓ cart_items         - 购物车
✓ orders             - 订单
✓ reviews            - 评价
✓ coupons            - 优惠券
✓ user_coupons       - 用户优惠券
✓ group_activities   - 拼团活动
✓ groups             - 拼团记录
```

**2.4 配置数据库权限**

在云开发控制台为每个集合设置权限：
- `users`: 仅创建者可读写
- `products`: 所有用户可读，仅管理员可写
- `addresses`: 仅创建者可读写
- `cart_items`: 仅创建者可读写
- `orders`: 仅创建者可读写
- `reviews`: 所有用户可读，仅创建者可写
- `coupons`: 所有用户可读
- `user_coupons`: 仅创建者可读写
- `group_activities`: 所有用户可读
- `groups`: 所有用户可读

**2.5 创建数据库索引**

为提高查询性能，需要创建以下索引：

```javascript
// products 集合
{ "category": 1 }
{ "status": 1, "sales": -1 }

// orders 集合
{ "userId": 1, "createdAt": -1 }
{ "status": 1 }
{ "orderNo": 1 }

// cart_items 集合
{ "userId": 1 }

// user_coupons 集合
{ "userId": 1, "status": 1 }
```

**2.6 部署云函数**

在微信开发者工具中，右键每个云函数文件夹，选择"上传并部署：云端安装依赖"

需要部署的云函数（共 36 个）：
```
✓ login                    ✓ getProducts
✓ getUserProfile           ✓ getProductDetail
✓ updateUserInfo           ✓ searchProducts
✓ getAddresses             ✓ getCart
✓ addAddress               ✓ addToCart
✓ updateAddress            ✓ updateCartItem
✓ deleteAddress            ✓ deleteCartItem
✓ createOrder              ✓ getOrders
✓ getOrderDetail           ✓ cancelOrder
✓ confirmReceipt           ✓ createPayment
✓ paymentNotify            ✓ getLogistics
✓ updateLogistics          ✓ submitReview
✓ getReviews               ✓ addFavorite
✓ removeFavorite           ✓ getFavorites
✓ getCoupons               ✓ claimCoupon
✓ getUserCoupons           ✓ getAvailableCoupons
✓ getGroupActivities       ✓ getGroupDetail
✓ createGroup              ✓ joinGroup
✓ checkExpiredGroups       ✓ checkExpiredOrders
✓ updateMemberLevel        ✓ getStatistics
✓ updateStock              ✓ getStockWarnings
✓ getHomeData              ✓ database-init
```

**2.7 配置定时触发器**

在云开发控制台为以下云函数配置定时触发器：

- `checkExpiredOrders`: 每 5 分钟执行一次
  ```
  0 */5 * * * * *
  ```

- `checkExpiredGroups`: 每 10 分钟执行一次
  ```
  0 */10 * * * * *
  ```

---

### 3. 静态资源配置

**3.1 创建 TabBar 图标**

需要创建以下图标文件（建议尺寸 81x81 px）：

```
miniprogram/images/tab/
├── home.png              (首页-未选中)
├── home-active.png       (首页-选中)
├── category.png          (分类-未选中)
├── category-active.png   (分类-选中)
├── cart.png              (购物车-未选中)
├── cart-active.png       (购物车-选中)
├── user.png              (我的-未选中)
└── user-active.png       (我的-选中)
```

📍 配置位置：`miniprogram/app.json` 第 30-53 行

**3.2 准备商品图片**

- [ ] 准备商品图片并上传到云存储
- [ ] 获取图片的云存储 URL
- [ ] 在数据库中配置商品图片 URL

**3.3 准备轮播图**

- [ ] 准备首页轮播图（建议尺寸 750x400 px）
- [ ] 上传到云存储
- [ ] 在数据库中配置轮播图数据

---

### 4. 初始化数据

**4.1 运行数据库初始化**

可以使用 `database-init` 云函数初始化测试数据，或手动在云开发控制台添加数据。

**4.2 添加商品数据**

在 `products` 集合中添加商品，示例：

```json
{
  "name": "西湖龙井",
  "category": "tea",
  "images": ["cloud://xxx.png"],
  "description": "正宗西湖龙井，清香甘醇",
  "price": 29800,
  "originalPrice": 39800,
  "stock": 100,
  "sales": 0,
  "rating": 5.0,
  "reviewCount": 0,
  "status": 1,
  "filters": {
    "type": "green",
    "age": "3"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**重要**：商品数据需要包含 `filters` 字段以支持分类筛选功能。

不同分类的 filters 字段：
- 茶叶：`{ type: "green", age: "3" }`
- 陈皮：`{ origin: "xinhui", age: "10", type: "dahongpao" }`
- 紫砂壶：`{ shape: "xishi", craft: "full" }`

详细说明请查看 `miniprogram/pages/category/FILTER_GUIDE.md`

**4.3 添加优惠券数据**

在 `coupons` 集合中添加优惠券。

**4.4 添加拼团活动**

在 `group_activities` 集合中添加拼团活动。

---

### 5. 域名配置

**5.1 配置服务器域名**

在微信公众平台 → 开发 → 开发管理 → 服务器域名中配置：

- request 合法域名：云开发域名会自动配置
- uploadFile 合法域名：云开发域名会自动配置
- downloadFile 合法域名：云开发域名会自动配置

**5.2 配置业务域名（可选）**

如果需要在小程序中打开网页，需要配置业务域名。

---

### 6. 隐私协议配置

**6.1 配置隐私政策**

- [ ] 在微信公众平台配置隐私政策链接
- [ ] 配置用户信息收集说明

**6.2 配置地理位置权限说明**

已在 `app.json` 中配置：
```json
"permission": {
  "scope.userLocation": {
    "desc": "你的位置信息将用于配送地址定位"
  }
}
```

---

### 7. 支付配置（重要）

**7.1 配置支付参数**

在 `createPayment` 云函数中配置：

```javascript
// cloudfunctions/createPayment/index.js
const mchid = 'your-mchid'           // 商户号
const apiKey = 'your-api-key'        // API密钥
const certPath = 'path-to-cert'      // 证书路径
```

**7.2 配置支付回调**

在 `paymentNotify` 云函数中配置回调处理逻辑。

---

## 🚀 部署步骤

### 步骤 1：本地开发测试

1. 安装微信开发者工具
2. 导入项目
3. 修改 `project.config.json` 中的 appid
4. 修改 `app.js` 中的云环境 ID
5. 创建 TabBar 图标
6. 点击"编译"测试

### 步骤 2：云开发配置

1. 在开发者工具中点击"云开发"按钮
2. 开通云开发环境
3. 创建数据库集合
4. 配置数据库权限和索引
5. 上传并部署所有云函数
6. 配置定时触发器

### 步骤 3：初始化数据

1. 上传商品图片到云存储
2. 添加商品数据
3. 添加优惠券和拼团活动
4. 测试数据是否正常显示

### 步骤 4：功能测试

1. 测试用户登录
2. 测试商品浏览和搜索
3. 测试购物车功能
4. 测试订单创建（暂不测试支付）
5. 测试地址管理
6. 测试收藏和评价

### 步骤 5：支付配置（可选）

1. 申请微信支付商户号
2. 配置支付参数
3. 测试支付流程

### 步骤 6：提交审核

1. 完善小程序信息
2. 配置隐私协议
3. 上传代码
4. 提交审核
5. 等待审核通过
6. 发布上线

---

## ⚡ 快速开始（最小可运行配置）

如果你想快速看到效果，只需完成以下最小配置：

### 必须配置（5 步）

1. **注册小程序并获取 AppID**
   - 修改 `project.config.json` 中的 appid

2. **开通云开发并获取环境 ID**
   - 修改 `miniprogram/app.js` 中的 env

3. **创建数据库集合**
   - 创建 users, products, cart_items, orders 等集合

4. **部署核心云函数**
   - 至少部署：login, getProducts, getCart, addToCart, createOrder

5. **创建 TabBar 图标**
   - 在 `miniprogram/images/tab/` 目录下创建 8 个图标文件

### 可选配置（后续完善）

- 添加商品数据（可以先用测试数据）
- 配置支付功能（可以先跳过支付测试）
- 配置定时任务（可以后续添加）
- 添加优惠券和拼团（可以后续添加）

---

## 📝 注意事项

1. **云环境 ID 必须正确**：否则所有云函数调用都会失败
2. **AppID 必须正确**：否则无法在真机上运行
3. **TabBar 图标必须存在**：否则小程序无法启动
4. **数据库集合必须创建**：否则云函数会报错
5. **云函数必须部署**：否则前端调用会失败

---

## 🔧 常见问题

### Q1: 小程序启动报错 "tabBar 图标不存在"
**A**: 需要创建 TabBar 图标文件，或临时注释掉 app.json 中的 tabBar 配置

### Q2: 云函数调用失败
**A**: 检查云环境 ID 是否正确，云函数是否已部署

### Q3: 数据库操作失败
**A**: 检查数据库集合是否已创建，权限是否正确配置

### Q4: 支付功能无法使用
**A**: 需要申请微信支付商户号并配置支付参数，开发阶段可以先跳过

### Q5: 真机预览白屏
**A**: 检查 AppID 是否正确，是否已添加开发者账号

---

## 📚 相关文档

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [微信支付文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)

---

## ✅ 部署完成后的验证

部署完成后，应该能够：

- ✓ 打开小程序看到首页
- ✓ 浏览商品列表
- ✓ 搜索商品
- ✓ 查看商品详情
- ✓ 添加商品到购物车
- ✓ 管理购物车
- ✓ 创建订单（不含支付）
- ✓ 查看订单列表
- ✓ 管理收货地址
- ✓ 收藏商品
- ✓ 查看个人中心

---

**总结**：代码已经完整实现，但需要完成上述配置才能部署运行。建议先完成"快速开始"部分的最小配置，看到效果后再逐步完善其他功能。
