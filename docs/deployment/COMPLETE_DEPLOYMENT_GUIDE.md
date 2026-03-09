# 完整部署指南

## 当前状态
- ✅ 已部署：getHomeData, getProducts, getProductDetail
- ✅ 已创建：products 数据库集合（1条数据）
- ❌ 未部署：用户相关云函数
- ❌ 未创建：users 数据库集合

## 第一步：部署用户相关云函数

### 必须部署的云函数（按顺序）

1. **login** - 用户登录
   ```
   右键 cloudfunctions/login → 上传并部署：云端安装依赖
   ```

2. **getUserInfo** - 获取用户信息
   ```
   右键 cloudfunctions/getUserInfo → 上传并部署：云端安装依赖
   ```

3. **updateUserInfo** - 更新用户信息（头像、昵称）
   ```
   右键 cloudfunctions/updateUserInfo → 上传并部署：云端安装依赖
   ```

4. **getOrders** - 获取订单列表（用于显示订单统计）
   ```
   右键 cloudfunctions/getOrders → 上传并部署：云端安装依赖
   ```

## 第二步：创建数据库集合

### 1. 创建 users 集合

在云开发控制台：
1. 点击"数据库"
2. 点击"添加集合"
3. 集合名称：`users`
4. 点击"确定"

### 2. 设置 users 集合权限

在 users 集合页面：
1. 点击"权限设置"
2. 选择"仅创建者可读写"（推荐）
   - 或选择"所有用户可读，仅创建者可写"

### 3. users 集合字段说明

登录时会自动创建用户记录，包含以下字段：
```json
{
  "_id": "自动生成的用户ID",
  "openid": "微信用户唯一标识",
  "unionid": "微信开放平台唯一标识（可选）",
  "nickname": "用户昵称",
  "avatar": "头像云存储地址",
  "phone": "手机号",
  "memberLevel": 0,
  "totalSpent": 0,
  "createdAt": "2026-02-13T...",
  "updatedAt": "2026-02-13T..."
}
```

### 4. 创建其他必要集合

如果还没有创建，需要创建：

- **orders** - 订单集合
  ```
  数据库 → 添加集合 → 名称：orders
  ```

- **carts** - 购物车集合
  ```
  数据库 → 添加集合 → 名称：carts
  ```

- **addresses** - 地址集合
  ```
  数据库 → 添加集合 → 名称：addresses
  ```

## 第三步：配置云存储（用于头像上传）

### 1. 创建存储目录结构

在云开发控制台 → 云存储：
1. 点击"上传文件"旁边的"新建文件夹"
2. 创建文件夹：`avatars`（用于存储用户头像）

### 2. 设置云存储权限

在云存储页面：
1. 点击"权限设置"
2. 选择"所有用户可读，仅创建者可写"
   - 这样用户可以上传自己的头像
   - 也可以查看其他用户的头像

## 第四步：验证部署

### 1. 检查云函数列表

在云开发控制台 → 云函数：
- ✅ login
- ✅ getUserInfo  
- ✅ updateUserInfo
- ✅ getHomeData
- ✅ getProducts
- ✅ getProductDetail
- ✅ getOrders

### 2. 检查数据库集合

在云开发控制台 → 数据库：
- ✅ products（已有1条数据）
- ✅ users（空集合，登录后自动创建数据）
- ✅ orders（空集合）
- ✅ carts（空集合）

### 3. 检查云存储

在云开发控制台 → 云存储：
- ✅ avatars 文件夹

## 第五步：测试功能

### 1. 测试登录
1. 重新编译小程序
2. 进入"我的"页面
3. 点击"点击登录"
4. 应该显示"登录成功"
5. 页面显示用户信息（昵称：微信用户）

### 2. 测试头像修改
1. 登录后，点击头像
2. 选择一张图片
3. 等待上传（显示"上传中..."）
4. 应该显示"头像更新成功"
5. 头像更新为新图片

### 3. 测试昵称修改
1. 点击昵称输入框
2. 输入新昵称，如"茶友001"
3. 点击其他地方（失去焦点）
4. 应该显示"昵称更新成功"

### 4. 检查数据库
在云开发控制台 → 数据库 → users：
- 应该看到一条新的用户记录
- 包含你的 openid、昵称、头像等信息

## 常见问题排查

### Q1: 登录后报错 "FUNCTION_NOT_FOUND"
**原因**：getUserInfo 或 getOrders 云函数未部署
**解决**：部署这两个云函数

### Q2: 头像上传失败
**原因**：云存储权限未设置
**解决**：
1. 云开发控制台 → 云存储 → 权限设置
2. 选择"所有用户可读，仅创建者可写"

### Q3: 数据库写入失败
**原因**：users 集合不存在或权限不对
**解决**：
1. 创建 users 集合
2. 设置权限为"仅创建者可读写"

### Q4: 登录成功但看不到用户信息
**原因**：getUserInfo 调用失败
**解决**：
1. 查看控制台错误信息
2. 检查 getUserInfo 云函数日志
3. 确认 users 集合已创建

## 部署检查清单

### 云函数部署
- [ ] login 已部署
- [ ] getUserInfo 已部署
- [ ] updateUserInfo 已部署
- [ ] getOrders 已部署
- [ ] getHomeData 已部署（之前已完成）
- [ ] getProducts 已部署（之前已完成）
- [ ] getProductDetail 已部署（之前已完成）

### 数据库集合
- [ ] products 集合已创建（之前已完成）
- [ ] users 集合已创建
- [ ] orders 集合已创建
- [ ] carts 集合已创建
- [ ] addresses 集合已创建

### 云存储
- [ ] avatars 文件夹已创建
- [ ] 云存储权限已设置

### 功能测试
- [ ] 登录功能正常
- [ ] 头像修改正常
- [ ] 昵称修改正常
- [ ] 首页显示商品
- [ ] 用户信息显示正常

## 下一步

完成以上部署后，小程序的核心功能就可以正常使用了：
1. ✅ 用户登录
2. ✅ 头像修改
3. ✅ 昵称修改
4. ✅ 首页展示
5. ✅ 商品浏览
6. ✅ 分类筛选
7. ✅ 底部导航

还需要部署的功能（可选）：
- 购物车功能（addToCart, getCart, updateCartItem, deleteCartItem）
- 订单功能（createOrder, getOrderDetail, cancelOrder）
- 地址管理（getAddresses, addAddress, updateAddress, deleteAddress）
- 收藏功能（addFavorite, removeFavorite, getFavorites）
- 优惠券功能（getCoupons, claimCoupon, getUserCoupons）
