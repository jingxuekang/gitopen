# 会员价格显示功能实现总结

## 实现内容

### 1. 工具函数

**位置**：`miniprogram/utils/util.js`

**新增函数**：
- `calculateMemberPrice(price, memberLevel)` - 根据会员等级计算会员价格
  - 普通会员（0）：原价
  - 银卡会员（1）：9.5折
  - 金卡会员（2）：9折
  
- `getMemberDiscount(memberLevel)` - 获取会员折扣率
  - 返回折扣率数值（如95表示9.5折）

### 2. 云函数：getUserProfile

**位置**：`cloudfunctions/getUserProfile/`

**功能**：
- 获取用户完整资料，包括会员等级
- 用于前端页面获取用户会员等级信息

**返回数据**：
```javascript
{
  _id: String,
  openid: String,
  nickname: String,
  avatar: String,
  phone: String,
  memberLevel: Number,  // 会员等级
  totalSpent: Number    // 累计消费
}
```

### 3. 前端页面更新

#### 首页（index）

**修改文件**：
- `miniprogram/pages/index/index.js`
- `miniprogram/pages/index/index.wxml`
- `miniprogram/pages/index/index.wxss`

**新增功能**：
- 页面加载时获取用户会员等级
- 热销推荐和新品推荐商品显示会员价格
- 会员价格显示金色徽章和原价对比

**UI效果**：
```
[会员] ¥45.00
原价 ¥50.00
```

#### 分类页（category）

**修改文件**：
- `miniprogram/pages/category/category.js`
- `miniprogram/pages/category/category.wxml`
- `miniprogram/pages/category/category.wxss`

**新增功能**：
- 商品列表显示会员价格
- 与首页相同的会员价格展示样式

#### 商品详情页（product）

**修改文件**：
- `miniprogram/pages/product/product.js`
- `miniprogram/pages/product/product.wxml`
- `miniprogram/pages/product/product.wxss`

**新增功能**：
- 商品价格区域显示会员价格
- 显示会员折扣标签（如"9折"）
- 原价和会员价对比展示

**UI效果**：
```
[会员价] ¥45.00
原价 ¥50.00  [9折]
```

#### 订单确认页（order/confirm）

**修改文件**：
- `miniprogram/pages/order/confirm/confirm.js`
- `miniprogram/pages/order/confirm/confirm.wxml`
- `miniprogram/pages/order/confirm/confirm.wxss`

**新增功能**：
- 价格计算逻辑更新，支持会员折扣
- 价格明细显示会员优惠金额
- 会员折扣在优惠券之前应用

**价格计算逻辑**：
```
商品总价（原价）
- 会员优惠（如果是会员）
= 会员折扣后价格
- 优惠券优惠（基于会员折扣后价格）
= 实付金额
```

**UI效果**：
```
商品总价    ¥100.00
[会员] 会员优惠  -¥10.00
优惠券      -¥5.00
实付：¥85.00
```

### 4. 云函数更新

#### createOrder

**修改文件**：`cloudfunctions/createOrder/index.js`

**新增字段**：
- `memberDiscount` - 会员折扣金额
- `memberLevel` - 下单时的会员等级

**订单数据结构更新**：
```javascript
{
  orderNo: String,
  userId: String,
  items: Array,
  totalAmount: Number,      // 商品总价
  memberDiscount: Number,   // 会员折扣金额（新增）
  discountAmount: Number,   // 优惠券折扣金额
  payAmount: Number,        // 实付金额
  memberLevel: Number,      // 会员等级（新增）
  // ... 其他字段
}
```

## 会员价格规则

| 会员等级 | 折扣 | 计算方式 |
|---------|------|---------|
| 普通会员（0） | 无折扣 | 原价 |
| 银卡会员（1） | 9.5折 | 原价 × 0.95 |
| 金卡会员（2） | 9折 | 原价 × 0.9 |

## 价格计算流程

### 商品列表/详情页

1. 页面加载时获取用户会员等级
2. 如果是会员（memberLevel > 0），显示会员价格
3. 会员价格 = 原价 × 折扣率
4. 同时显示原价和会员价，突出会员优惠

### 订单确认页

1. 加载用户会员等级
2. 计算商品总价（原价）
3. 如果是会员，计算会员折扣金额
4. 基于会员折扣后的价格，应用优惠券
5. 最终实付金额 = 商品总价 - 会员折扣 - 优惠券折扣

## UI设计要点

### 会员标识

- 使用金色渐变背景（#D4AF37 到 #F4D03F）
- 白色文字，圆角设计
- 醒目但不突兀

### 价格展示

- 会员价格使用金色（#D4AF37）
- 原价使用灰色并添加删除线
- 折扣标签使用浅红色背景

### 响应式设计

- 商品列表：紧凑布局，会员价和原价垂直排列
- 商品详情：大字号显示，折扣标签明显
- 订单确认：清晰的价格明细，每项优惠单独列出

## 技术实现要点

1. **实时更新**：页面显示时（onShow）重新获取用户会员等级，确保等级变化后立即生效
2. **静默失败**：获取会员等级失败不影响页面正常显示，默认按普通会员处理
3. **价格精度**：所有价格计算使用"分"为单位，避免浮点数精度问题
4. **向下取整**：会员价格计算后向下取整（Math.floor），对用户更友好
5. **优惠叠加**：会员折扣先于优惠券应用，优惠券基于会员折扣后的价格计算

## 测试建议

1. 测试普通会员查看商品，不显示会员价格
2. 测试银卡会员查看商品，显示9.5折会员价格
3. 测试金卡会员查看商品，显示9折会员价格
4. 测试订单确认页会员折扣计算准确性
5. 测试会员折扣和优惠券叠加使用
6. 测试会员升级后价格立即更新
7. 测试不同规格商品的会员价格计算

## 相关需求

- **需求 15.4**：在商品价格上显示会员折扣 ✅
- **需求 15.6**：会员专属优惠券（待实现）

## 部署说明

1. 上传并部署 `getUserProfile` 云函数
2. 更新前端代码到小程序
3. 测试各页面会员价格显示
4. 测试订单创建和价格计算

## 注意事项

1. 会员价格仅在用户登录且会员等级大于0时显示
2. 会员折扣不能与某些特殊活动（如拼团）叠加使用
3. 订单中记录下单时的会员等级，避免后续等级变化影响订单
4. 会员价格计算向下取整，确保不会出现小数点后超过2位的情况
5. 前端显示价格时统一使用 formatPrice 函数转换为元

## 后续优化建议

1. 实现会员专属优惠券功能
2. 在商品列表添加"会员专享"标签
3. 在个人中心显示会员节省的总金额
4. 添加会员日活动，特定日期额外折扣
5. 实现会员积分系统，购物获得积分
