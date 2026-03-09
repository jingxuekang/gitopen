# 快速部署步骤（5分钟完成）

## 步骤1：部署4个用户相关云函数（2分钟）

在微信开发者工具中，依次右键以下文件夹，选择"上传并部署：云端安装依赖"：

1. `cloudfunctions/login`
2. `cloudfunctions/getUserInfo`
3. `cloudfunctions/updateUserInfo`
4. `cloudfunctions/getOrders`

等待每个云函数显示绿色✓

---

## 步骤2：创建5个数据库集合（2分钟）

打开云开发控制台 → 数据库 → 点击"添加集合"，依次创建：

1. 集合名：`users` → 确定
2. 集合名：`orders` → 确定
3. 集合名：`carts` → 确定
4. 集合名：`addresses` → 确定
5. 集合名：`coupons` → 确定

（products 集合之前已创建）

---

## 步骤3：设置云存储权限（1分钟）

1. 云开发控制台 → 云存储
2. 点击"权限设置"
3. 选择"所有用户可读，仅创建者可写"
4. 点击"保存"

---

## 步骤4：测试（1分钟）

1. 重新编译小程序
2. 进入"我的"页面
3. 点击"点击登录"
4. 看到"登录成功" ✅
5. 点击头像，选择图片，看到"头像更新成功" ✅

---

## 完成！

现在可以正常使用：
- ✅ 登录功能
- ✅ 头像修改
- ✅ 昵称修改
- ✅ 首页展示
- ✅ 商品浏览
- ✅ 底部导航

---

## 如果遇到问题

### 登录失败
- 检查 login 云函数是否部署成功（有绿色✓）
- 检查 users 集合是否创建

### 头像上传失败
- 检查云存储权限是否设置
- 检查 updateUserInfo 云函数是否部署

### 看不到用户信息
- 检查 getUserInfo 云函数是否部署
- 查看控制台错误信息

---

## 查看部署状态

### 云函数列表
云开发控制台 → 云函数 → 应该看到：
- login ✅
- getUserInfo ✅
- updateUserInfo ✅
- getOrders ✅
- getHomeData ✅
- getProducts ✅
- getProductDetail ✅

### 数据库集合
云开发控制台 → 数据库 → 应该看到：
- products ✅
- users ✅
- orders ✅
- carts ✅
- addresses ✅
- coupons ✅
