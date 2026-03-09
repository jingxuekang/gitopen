# 云函数部署指南

## 新增云函数（任务 3.6）

为实现商品详情页的收藏功能，新增了以下云函数：

### 1. addFavorite
**功能：** 添加商品到收藏列表

**部署步骤：**
```bash
cd cloudfunctions/addFavorite
npm install
# 在微信开发者工具中右键点击 addFavorite 文件夹，选择"上传并部署：云端安装依赖"
```

### 2. removeFavorite
**功能：** 从收藏列表移除商品

**部署步骤：**
```bash
cd cloudfunctions/removeFavorite
npm install
# 在微信开发者工具中右键点击 removeFavorite 文件夹，选择"上传并部署：云端安装依赖"
```

### 3. getFavorites
**功能：** 获取用户的收藏列表

**部署步骤：**
```bash
cd cloudfunctions/getFavorites
npm install
# 在微信开发者工具中右键点击 getFavorites 文件夹，选择"上传并部署：云端安装依赖"
```

## 数据库更新

### 更新 database-init 云函数

database-init 云函数已更新，新增了 `favorites` 集合的创建和索引。

**重新部署步骤：**
```bash
cd cloudfunctions/database-init
npm install
# 在微信开发者工具中右键点击 database-init 文件夹，选择"上传并部署：云端安装依赖"
```

**运行初始化：**
在微信开发者工具的云开发控制台中，找到 database-init 云函数，点击"测试"按钮运行。

### favorites 集合结构

```javascript
{
  _id: ObjectId,
  userId: String,      // 用户openid
  productId: String,   // 商品ID
  createdAt: Date      // 创建时间
}
```

### 索引

- `userId`: 用于快速查询用户的收藏列表
- `userId + productId`: 唯一索引，防止重复收藏

## 部署检查清单

- [ ] 部署 addFavorite 云函数
- [ ] 部署 removeFavorite 云函数
- [ ] 部署 getFavorites 云函数
- [ ] 重新部署 database-init 云函数
- [ ] 运行 database-init 创建 favorites 集合
- [ ] 验证 favorites 集合已创建
- [ ] 验证索引已创建

## 测试建议

1. 在商品详情页点击收藏按钮
2. 检查云数据库中是否创建了收藏记录
3. 再次点击收藏按钮，验证取消收藏功能
4. 检查云数据库中记录是否被删除
5. 刷新页面，验证收藏状态是否正确显示

## 注意事项

1. 确保云开发环境已开通
2. 确保云函数有足够的权限访问数据库
3. 首次部署需要安装依赖，可能需要几分钟时间
4. 建议在测试环境先部署测试，确认无误后再部署到生产环境
