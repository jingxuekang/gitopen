# 微信小程序黑屏问题排查

## 🔍 常见原因

### 1. AppID 未配置或错误
**最常见原因**：使用测试号但 AppID 配置错误

**检查**：
- 打开 `project.config.json`
- 查看 `appid` 字段
- 如果是 `"your-appid"` 或其他占位符，需要修改

**解决方案**：
1. 在微信开发者工具中，点击右上角"详情"
2. 查看"AppID"是否正确
3. 或者使用"测试号"（不校验合法域名）

---

### 2. 云开发环境 ID 未配置
**原因**：`app.js` 中的云环境 ID 是占位符

**检查**：
- 打开 `miniprogram/app.js`
- 查看第 8 行：`env: 'your-env-id'`

**解决方案**：
1. 点击微信开发者工具的"云开发"按钮
2. 开通云开发（如果还没开通）
3. 复制云环境 ID
4. 替换 `app.js` 中的 `your-env-id`

---

### 3. TabBar 图标不存在
**原因**：`app.json` 配置了 TabBar 图标，但文件不存在

**检查**：
- 查看 `miniprogram/images/tab/` 目录
- 是否有 8 个图标文件

**解决方案 A**（临时）：
注释掉 `app.json` 中的 tabBar 配置：

```json
{
  "pages": [...],
  "window": {...}
  // 临时注释掉
  // "tabBar": {
  //   ...
  // }
}
```

**解决方案 B**（推荐）：
创建占位图标文件（见下方）

---

### 4. 页面路径错误
**原因**：`app.json` 中配置的页面文件不存在

**检查**：
- 打开 `app.json`
- 查看 `pages` 数组
- 确认每个页面文件都存在

---

### 5. 代码语法错误
**原因**：JS 文件有语法错误导致无法启动

**检查**：
- 查看微信开发者工具的"调试器"标签
- 查看"Console"面板是否有错误信息

---

## 🚀 快速修复步骤

### 步骤 1：使用测试号（最快）

1. 打开微信开发者工具
2. 点击右上角"详情"
3. 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
4. 在"基本信息"中，点击"使用测试号"

### 步骤 2：临时注释 TabBar

修改 `miniprogram/app.json`：

```json
{
  "pages": [
    "pages/index/index",
    "pages/category/category",
    "pages/cart/cart",
    "pages/user/user"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#2C5F2D",
    "navigationBarTitleText": "茶韵商城",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#F5F5F5"
  }
  // 临时注释掉 TabBar，等有图标后再启用
  // "tabBar": {
  //   ...
  // }
}
```

### 步骤 3：临时修改云开发配置

修改 `miniprogram/app.js`：

```javascript
wx.cloud.init({
  // 临时注释掉，避免云开发初始化失败
  // env: 'your-env-id',
  traceUser: true,
})
```

### 步骤 4：重新编译

1. 点击微信开发者工具的"编译"按钮
2. 或按快捷键 `Ctrl + B`（Windows）/ `Cmd + B`（Mac）

---

## 🔧 详细排查方法

### 查看控制台错误

1. 打开微信开发者工具
2. 点击底部的"调试器"标签
3. 查看"Console"面板
4. 截图发给我，我帮你分析

### 查看网络请求

1. 在"调试器"中点击"Network"标签
2. 查看是否有请求失败（红色）
3. 点击失败的请求查看详情

### 查看 AppData

1. 在"调试器"中点击"AppData"标签
2. 查看页面数据是否正常加载

---

## 📝 创建临时 TabBar 图标

如果需要 TabBar，可以创建简单的占位图标：

### 方法 1：使用在线工具

1. 访问 https://www.iconfont.cn/
2. 搜索"首页"、"分类"、"购物车"、"我的"
3. 下载 PNG 格式，尺寸 81x81
4. 保存到 `miniprogram/images/tab/` 目录

### 方法 2：使用纯色图片

创建 8 个纯色 PNG 图片（81x81）：
- `home.png` - 灰色方块
- `home-active.png` - 绿色方块
- `category.png` - 灰色方块
- `category-active.png` - 绿色方块
- `cart.png` - 灰色方块
- `cart-active.png` - 绿色方块
- `user.png` - 灰色方块
- `user-active.png` - 绿色方块

---

## 🎯 最可能的原因（根据截图）

看你的截图，最可能的原因是：

1. **AppID 未配置** - 使用了占位符 `your-appid`
2. **TabBar 图标不存在** - 配置了图标路径但文件不存在
3. **云开发未初始化** - 云环境 ID 是占位符

---

## ✅ 推荐的修复顺序

### 1. 立即修复（5分钟）

```javascript
// 1. 修改 app.json - 注释 TabBar
// 2. 修改 app.js - 注释云环境 ID
// 3. 使用测试号
// 4. 重新编译
```

### 2. 查看错误信息

打开调试器 Console，截图发给我

### 3. 逐步恢复功能

- 先让页面能显示
- 再配置云开发
- 最后添加 TabBar 图标

---

## 📞 需要更多帮助？

请提供以下信息：

1. **Console 错误信息**（调试器 → Console 标签）
2. **是否使用测试号**
3. **是否开通了云开发**
4. **project.config.json 中的 appid 值**

我会根据具体错误帮你解决！
