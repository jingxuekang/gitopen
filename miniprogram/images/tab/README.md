# TabBar 图标说明

## 需要创建的图标文件

在此目录下需要创建以下 8 个图标文件：

### 图标列表

1. **home.png** - 首页图标（未选中状态）
2. **home-active.png** - 首页图标（选中状态）
3. **category.png** - 分类图标（未选中状态）
4. **category-active.png** - 分类图标（选中状态）
5. **cart.png** - 购物车图标（未选中状态）
6. **cart-active.png** - 购物车图标（选中状态）
7. **user.png** - 我的图标（未选中状态）
8. **user-active.png** - 我的图标（选中状态）

## 图标规格

- **尺寸**: 81x81 像素（推荐）
- **格式**: PNG（支持透明背景）
- **颜色**: 
  - 未选中状态：灰色 (#999999)
  - 选中状态：深绿色 (#2C5F2D)

## 设计建议

### 首页图标 (home)
- 可以使用房子图标
- 或者使用茶叶图标体现品牌特色

### 分类图标 (category)
- 可以使用网格图标
- 或者使用分类标签图标

### 购物车图标 (cart)
- 使用购物车图标
- 简洁明了

### 我的图标 (user)
- 使用人物头像图标
- 或者使用个人中心图标

## 临时解决方案

如果暂时没有图标，可以：

### 方案 1：使用在线图标生成器
- [iconfont](https://www.iconfont.cn/) - 阿里巴巴矢量图标库
- [iconpark](https://iconpark.oceanengine.com/) - 字节跳动图标库
- [flaticon](https://www.flaticon.com/) - 免费图标库

### 方案 2：临时注释 TabBar 配置
在 `miniprogram/app.json` 中临时注释掉 tabBar 配置：

```json
{
  "pages": [...],
  "window": {...},
  // "tabBar": {
  //   ...
  // }
}
```

注意：注释后将无法使用底部导航栏，需要手动输入页面路径进行测试。

### 方案 3：使用纯色占位图标
创建简单的纯色方块作为临时图标：
- 创建 81x81 的纯色 PNG 图片
- 未选中状态使用浅灰色
- 选中状态使用深绿色

## 快速创建图标的方法

### 使用 Photoshop/Sketch/Figma
1. 创建 81x81 画布
2. 绘制简单图标
3. 导出为 PNG

### 使用在线工具
1. 访问 https://www.iconfont.cn/
2. 搜索需要的图标
3. 下载 PNG 格式
4. 调整尺寸为 81x81

### 使用代码生成（临时方案）
可以使用 Canvas 或其他工具生成简单的占位图标。

## 注意事项

1. 图标文件名必须与 app.json 中配置的完全一致
2. 图标必须放在 `miniprogram/images/tab/` 目录下
3. 建议使用透明背景的 PNG 格式
4. 图标设计要简洁清晰，在小尺寸下也能识别
5. 选中和未选中状态要有明显区别

## 参考资源

- [微信小程序 TabBar 设计规范](https://developers.weixin.qq.com/miniprogram/design/#tabbar)
- [微信小程序图标设计指南](https://developers.weixin.qq.com/miniprogram/design/icon/)
