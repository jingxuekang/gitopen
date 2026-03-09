# 创建 TabBar 图标

## 问题
小程序需要底部导航栏的图标文件，但目前 `images/tab/` 目录下没有图标。

## 解决方案

### 方法 1：使用在线图标（最快）

1. 访问 https://www.iconfont.cn/
2. 搜索以下图标并下载（PNG 格式，81x81 像素）：
   - 首页图标（home）
   - 分类图标（category/grid）
   - 购物车图标（cart/shopping-cart）
   - 我的图标（user/profile）

3. 每个图标需要两个版本：
   - 灰色版本（未选中）：命名为 `home.png`
   - 绿色版本（选中）：命名为 `home-active.png`

4. 将 8 个图标文件放到 `images/tab/` 目录

### 方法 2：临时移除 TabBar

如果暂时不想处理图标，可以先移除 TabBar 配置，通过其他方式导航：

**测试页面的方法**：
1. 在微信开发者工具顶部地址栏输入页面路径
2. 例如：
   - 分类页：`pages/category/category`
   - 购物车：`pages/cart/cart`
   - 用户中心：`pages/user/user`

### 方法 3：使用纯色占位图标

创建简单的纯色方块作为临时图标：

**需要的文件**（放在 `images/tab/` 目录）：
- home.png - 灰色方块
- home-active.png - 绿色方块
- category.png - 灰色方块
- category-active.png - 绿色方块
- cart.png - 灰色方块
- cart-active.png - 绿色方块
- user.png - 灰色方块
- user-active.png - 绿色方块

## 当前状态

已恢复 TabBar 配置到 `app.json`，但缺少图标文件。

## 建议

**立即可做**：
- 使用方法 2，先移除 TabBar，通过地址栏测试各个页面
- 确认功能正常后，再添加图标

**后续优化**：
- 使用方法 1，下载专业图标
- 提升用户体验
