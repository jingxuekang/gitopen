# 首页轮播图 3D 堆叠效果说明

## ✅ 已实现的效果

### 1. WXML 结构
- 使用 `previous-margin` 和 `next-margin` 实现左右露出效果
- 每个轮播项包裹在 `.banner-card` 中
- 关闭默认指示点，使用自定义样式

### 2. CSS 样式特点
- **前后卡片**：`scale(0.8)` + `opacity: 0.6`（缩小 + 半透明）
- **当前卡片**：`scale(1)` + `opacity: 1`（正常大小 + 完全不透明）
- **阴影层次**：当前卡片阴影更深，营造 3D 效果
- **平滑过渡**：`transition: all 0.3s ease`

### 3. 视觉效果
- ✅ 前后卡片叠层效果
- ✅ 中间卡片最大、两边缩小
- ✅ 透明度渐变
- ✅ 阴影深度变化
- ✅ 自动轮播 + 循环播放

## 🎨 效果预览

```
[小卡片]  【大卡片】  [小卡片]
 0.8倍      1倍       0.8倍
 60%透明   100%不透明  60%透明
```

## 📝 参数说明

- `previous-margin="20rpx"` - 左侧露出 20rpx
- `next-margin="20rpx"` - 右侧露出 20rpx
- `duration="300"` - 切换动画 300ms
- `easing-function="ease-out"` - 缓动函数
- `circular` - 循环播放
- `autoplay` - 自动播放

## 🔧 可调整参数

如需调整效果，可修改：
- 缩放比例：`.banner-card { transform: scale(0.8) }` → 改为 0.85 或 0.75
- 透明度：`opacity: 0.6` → 改为 0.5 或 0.7
- 左右边距：`previous-margin` 和 `next-margin` → 改为 30rpx 或 40rpx
- 卡片高度：`.banner-card { height: 360rpx }` → 改为其他高度
