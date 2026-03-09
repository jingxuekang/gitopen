# 黑屏问题快速修复

## 🔴 问题原因

TabBar 配置了图标路径，但图标文件不存在，导致小程序无法启动。

## ⚡ 快速修复（2分钟）

### 方法 1：临时移除 TabBar（推荐）

1. 打开 `miniprogram/app.json`
2. 找到 `"tabBar"` 这一段（第 31-60 行）
3. 删除或注释掉整个 tabBar 配置
4. 保存文件
5. 点击"编译"按钮

**修改后的 app.json**：

```json
{
  "pages": [
    "pages/index/index",
    "pages/category/category",
    "pages/cart/cart",
    "pages/user/user",
    ...其他页面
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#2C5F2D",
    "navigationBarTitleText": "茶韵商城",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#F5F5F5"
  },
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于配送地址定位"
    }
  },
  "requiredPrivateInfos": [
    "chooseAddress"
  ],
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

**注意**：删除了 `"tabBar"` 整个配置块

---

### 方法 2：创建占位图标

如果你想保留 TabBar，需要创建 8 个图标文件：

1. 在 `miniprogram/images/tab/` 目录下创建以下文件：
   - home.png
   - home-active.png
   - category.png
   - category-active.png
   - cart.png
   - cart-active.png
   - user.png
   - user-active.png

2. 图标规格：81x81 像素，PNG 格式

3. 可以从 https://www.iconfont.cn/ 下载

---

## 🎯 修复后的效果

### 移除 TabBar 后：
- ✅ 小程序可以正常启动
- ✅ 可以看到首页内容
- ❌ 没有底部导航栏
- ℹ️ 需要手动输入页面路径测试其他页面

### 添加图标后：
- ✅ 小程序可以正常启动
- ✅ 有底部导航栏
- ✅ 可以点击切换页面

---

## 📝 其他可能的问题

### 如果修复后还是黑屏：

1. **检查云开发配置**
   
   打开 `miniprogram/app.js`，临时注释掉云开发初始化：
   
   ```javascript
   wx.cloud.init({
     // 临时注释掉
     // env: 'your-env-id',
     traceUser: true,
   })
   ```

2. **使用测试号**
   
   - 点击微信开发者工具右上角"详情"
   - 点击"使用测试号"
   - 勾选"不校验合法域名..."

3. **查看控制台错误**
   
   - 点击底部"调试器"标签
   - 查看"Console"面板
   - 截图错误信息

---

## ✅ 验证修复

修复后应该能看到：
1. 首页显示（搜索栏、轮播图、分类入口等）
2. 没有报错信息
3. 可以点击页面元素

---

## 🔄 恢复 TabBar

等你准备好图标后，可以恢复 TabBar：

1. 将图标文件放到 `miniprogram/images/tab/` 目录
2. 恢复 `app.json` 中的 tabBar 配置
3. 重新编译

我已经为你备份了原始配置到 `miniprogram/app.json.backup`

---

## 💡 建议

**开发阶段**：
- 先不要 TabBar，专注功能开发
- 等功能都测试好了再添加图标

**测试方法**：
- 在微信开发者工具的地址栏输入页面路径
- 例如：`pages/category/category` 测试分类页

---

需要我帮你直接修改 app.json 文件吗？
