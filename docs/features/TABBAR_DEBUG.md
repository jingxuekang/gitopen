# 底部导航栏调试指南

## 已修复的问题

### 1. 跳转方法
- 从 `wx.switchTab` 改为 `wx.reLaunch`
- `switchTab` 需要在 app.json 中配置 tabBar，我们没有配置
- `reLaunch` 可以直接跳转到任何页面

### 2. 添加调试日志
在组件中添加了 console.log，可以在控制台查看：
- 点击时的 Tab 索引
- 跳转的 URL
- 跳转成功/失败的信息

### 3. 视觉反馈
- 点击时有缩放效果
- 当前 Tab 有底部绿色指示条
- 文字颜色和大小变化

## 调试步骤

### 1. 重新编译
在微信开发者工具中点击"编译"按钮

### 2. 检查控制台
打开控制台（Console），点击底部导航栏的各个 Tab，查看输出：
```
切换Tab: { from: 0, to: 1, url: "/pages/category/category" }
页面跳转成功: /pages/category/category
```

### 3. 检查页面路径
确认以下页面文件存在：
- pages/index/index.js
- pages/category/category.js
- pages/cart/cart.js
- pages/user/user.js

### 4. 检查组件注册
确认各页面的 JSON 文件中已注册组件：
```json
{
  "usingComponents": {
    "custom-tabbar": "/miniprogram/components/custom-tabbar/custom-tabbar"
  }
}
```

## 可能的问题

### 问题1: 点击没反应
**原因**: 组件路径错误或未注册
**解决**: 检查 JSON 文件中的 usingComponents 配置

### 问题2: 跳转失败
**原因**: 页面路径不存在
**解决**: 检查 app.json 中的 pages 配置和实际文件

### 问题3: 样式不对
**原因**: wxss 文件未加载
**解决**: 检查组件的 wxss 文件是否存在

## 测试清单

- [ ] 首页 → 分类：点击"分类"Tab
- [ ] 首页 → 购物车：点击"购物车"Tab
- [ ] 首页 → 我的：点击"我的"Tab
- [ ] 分类 → 首页：点击"首页"Tab
- [ ] 购物车 → 首页：点击"首页"Tab
- [ ] 我的 → 首页：点击"首页"Tab

## 控制台错误信息

如果看到错误，请记录以下信息：
1. 错误类型（红色/黄色）
2. 错误消息
3. 发生在哪个页面
4. 点击了哪个 Tab

## 组件文件位置

```
miniprogram/components/custom-tabbar/
├── custom-tabbar.js    (逻辑)
├── custom-tabbar.json  (配置)
├── custom-tabbar.wxml  (结构)
└── custom-tabbar.wxss  (样式)
```

## 页面文件位置

```
pages/
├── index/index.*       (首页)
├── category/category.* (分类)
├── cart/cart.*         (购物车)
└── user/user.*         (我的)
```
