# 茶叶商城设计系统 - 快速参考

## 🎨 色彩变量

```css
/* 主色调 - 茶绿色系 */
--primary-dark: #2C5F2D;
--primary-medium: #4A7C4E;
--primary-light: #E8F5E9;

/* 辅助色 */
--gold: #D4AF37;
--orange: #FF9800;
--blue: #2196F3;
--green: #4CAF50;
--red: #E74C3C;

/* 中性色 */
--text-primary: #333333;
--text-secondary: #666666;
--text-tertiary: #999999;
--bg-page: #F5F5F5;
--bg-card: #FFFFFF;
```

---

## 📏 尺寸规范

### 圆角
```css
border-radius: 50rpx;  /* 超大 - 搜索栏、胶囊 */
border-radius: 44rpx;  /* 大 - 按钮 */
border-radius: 40rpx;  /* 中大 - 卡片底部 */
border-radius: 16rpx;  /* 中 - 商品卡片 */
border-radius: 12rpx;  /* 小 - 小元素 */
```

### 间距
```css
padding: 60rpx;  /* 超大 */
padding: 40rpx;  /* 大 */
padding: 30rpx;  /* 中 */
padding: 20rpx;  /* 小 */
padding: 10rpx;  /* 超小 */
```

### 字号
```css
font-size: 48rpx;  /* 特大标题 */
font-size: 36rpx;  /* 大标题 */
font-size: 32rpx;  /* 标题 */
font-size: 28rpx;  /* 正文 */
font-size: 24rpx;  /* 辅助文字 */
font-size: 22rpx;  /* 小字 */
```

---

## 🌟 阴影模板

### 卡片阴影
```css
/* 轻阴影 */
box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

/* 中阴影 */
box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);

/* 重阴影 */
box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
```

### 彩色阴影
```css
/* 绿色按钮 */
box-shadow: 0 8rpx 20rpx rgba(44, 95, 45, 0.3);

/* 充值按钮 */
box-shadow: 0 8rpx 20rpx rgba(76, 175, 80, 0.3);

/* 提现按钮 */
box-shadow: 0 8rpx 20rpx rgba(33, 150, 243, 0.3);

/* 修改按钮 */
box-shadow: 0 8rpx 20rpx rgba(255, 152, 0, 0.3);
```

---

## 🎭 渐变模板

### 主色渐变
```css
/* 茶绿色渐变 */
background: linear-gradient(135deg, #2C5F2D 0%, #4A7C4E 100%);

/* 三色渐变 */
background: linear-gradient(135deg, #2C5F2D 0%, #3a7a3c 50%, #4A7C4E 100%);

/* 白色渐变 */
background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F8 100%);
```

### 辅助色渐变
```css
/* 充值绿 */
background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);

/* 提现蓝 */
background: linear-gradient(135deg, #2196F3 0%, #42A5F5 100%);

/* 修改橙 */
background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%);

/* 会员金 */
background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
```

---

## ⚡ 动画模板

### 点击缩放
```css
.btn {
  transition: all 0.2s;
}

.btn:active {
  transform: scale(0.95);
}
```

### 悬浮上移
```css
.card {
  transition: all 0.3s;
}

.card:active {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}
```

### 选中缩放
```css
.option {
  transition: all 0.2s;
}

.option.active {
  transform: scale(1.05);
}
```

---

## ✨ 特效模板

### 毛玻璃效果
```css
.element {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
}
```

### 装饰光晕
```css
.element {
  position: relative;
  overflow: hidden;
}

.element::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%;
}
```

### 半透明遮罩
```css
.overlay {
  background-color: rgba(255, 255, 255, 0.15);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}
```

---

## 🔘 按钮样式

### 主要按钮
```css
.primary-btn {
  height: 88rpx;
  background: linear-gradient(135deg, #2C5F2D 0%, #4A7C4E 100%);
  color: #FFFFFF;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 20rpx rgba(44, 95, 45, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.primary-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(44, 95, 45, 0.4);
}
```

### 次要按钮
```css
.secondary-btn {
  height: 88rpx;
  background: #FFFFFF;
  color: #2C5F2D;
  border: 2rpx solid #2C5F2D;
  border-radius: 44rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## 📦 卡片样式

### 标准卡片
```css
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 20rpx;
}
```

### 商品卡片
```css
.product-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  transition: all 0.3s;
}

.product-card:active {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}
```

---

## 🏷️ 标签样式

### 普通标签
```css
.tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  background: #E8F5E9;
  color: #2C5F2D;
}
```

### 胶囊标签
```css
.capsule-tag {
  padding: 16rpx 32rpx;
  background: #FFFFFF;
  border: 2rpx solid #E0E0E0;
  border-radius: 40rpx;
  font-size: 24rpx;
  color: #666666;
  transition: all 0.2s;
}

.capsule-tag.active {
  background: linear-gradient(135deg, #2C5F2D 0%, #4A7C4E 100%);
  color: #FFFFFF;
  border-color: transparent;
  transform: scale(1.05);
  box-shadow: 0 4rpx 12rpx rgba(44, 95, 45, 0.3);
}
```

---

## 📝 输入框样式

```css
.input {
  background: #F5F5F5;
  border-radius: 12rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
  font-size: 28rpx;
  transition: all 0.2s;
}

.input:focus {
  background: #FFFFFF;
  border-color: #2C5F2D;
  box-shadow: 0 0 0 4rpx rgba(44, 95, 45, 0.1);
}
```

---

## 💡 使用建议

### 1. 保持一致性
- 使用统一的圆角尺寸
- 使用统一的阴影效果
- 使用统一的动画时长

### 2. 性能优化
- 优先使用 `transform` 做动画
- 避免过度使用阴影和模糊
- 合理使用 `will-change`

### 3. 渐进增强
- 基础样式保证可用性
- 高级特效作为增强
- 考虑降级方案

### 4. 可维护性
- 使用 CSS 变量（如支持）
- 模块化样式文件
- 添加注释说明

---

**快速参考，随时查阅！** 📚
