# 为什么问题会重复出现？

## 问题分析

### 1. 项目结构问题

这个项目有两套代码目录：
```
├── pages/              # 根目录的页面（旧版本？）
└── miniprogram/
    └── pages/          # miniprogram 目录的页面（新版本？）
```

**问题：** 两个目录可能不同步，修复了一个目录的文件，另一个目录的相同文件可能还有问题。

---

## 当前发现的问题

### 已修复 ✅
- `miniprogram/pages/order/confirm/confirm.wxml` - `.toFixed()` 已修复
- `miniprogram/pages/order/detail/detail.wxml` - `.toFixed()` 已修复
- `pages/order/detail/detail.wxml` - `.toFixed()` 已修复

### 仍需修复 ⚠️

#### 1. product.wxml - 使用了 .join()
**位置：**
- `pages/product/product.wxml:51`
- `miniprogram/pages/product/product.wxml:51`

**问题代码：**
```xml
<text class="value">{{selectedSku ? selectedSku.specValues.join(' ') : '请选择'}}</text>
<text>{{item.specValues.join(' ')}}</text>
```

**解决方案：**
在 JS 中预先格式化：
```javascript
// product.js
data: {
  selectedSku: null,
  selectedSkuText: '请选择'
},

onSkuSelect(sku) {
  this.setData({
    selectedSku: sku,
    selectedSkuText: sku.specValues.join(' ')
  })
}
```

#### 2. customer-service.wxml - 使用了 .trim()
**位置：**
- `pages/customer-service/customer-service.wxml:39`
- `miniprogram/pages/customer-service/customer-service.wxml:39`

**问题代码：**
```xml
<button class="send-btn" bindtap="onSendText" disabled="{{!inputText.trim()}}">发送</button>
```

**解决方案：**
在 JS 中计算：
```javascript
// customer-service.js
data: {
  inputText: '',
  canSend: false
},

onInputChange(e) {
  const inputText = e.detail.value
  this.setData({
    inputText,
    canSend: inputText.trim().length > 0
  })
}
```

WXML 改为：
```xml
<button class="send-btn" bindtap="onSendText" disabled="{{!canSend}}">发送</button>
```

---

## 根本原因

### 1. 代码重复
- 同一个页面在两个目录都有副本
- 修改时容易遗漏其中一个

### 2. 缺少统一检查
- 没有在所有文件中统一检查
- 修复时只修复了部分文件

### 3. WXML 限制不熟悉
- 开发时不清楚 WXML 的限制
- 习惯性使用 JavaScript 方法

---

## 解决方案

### 短期方案：修复所有问题

#### 1. 全局搜索所有 JavaScript 方法调用
```bash
# 搜索所有可能的方法调用
grep -r "\.toFixed(" **/*.wxml
grep -r "\.join(" **/*.wxml
grep -r "\.trim(" **/*.wxml
grep -r "\.split(" **/*.wxml
grep -r "\.slice(" **/*.wxml
grep -r "\.substring(" **/*.wxml
grep -r "\.toLowerCase(" **/*.wxml
grep -r "\.toUpperCase(" **/*.wxml
```

#### 2. 逐个修复
- 在 JS 中预处理数据
- WXML 中只使用简单的数据绑定

#### 3. 同步两个目录
- 确保 `pages/` 和 `miniprogram/pages/` 内容一致
- 或者删除不使用的目录

---

### 长期方案：预防问题

#### 1. 建立代码规范

**WXML 编写规范：**
```markdown
✅ 允许：
- 简单属性访问：{{user.name}}
- 简单运算：{{price + 10}}
- 简单比较：{{count > 0}}

❌ 禁止：
- 方法调用：{{str.toFixed()}}
- 复杂表达式：{{arr.filter(...)}}
- 三元运算符嵌套：{{a ? (b ? c : d) : e}}
```

#### 2. 使用 WXS 处理简单格式化

创建 `utils/format.wxs`：
```xml
<wxs module="format">
  function price(value) {
    return (value / 100).toFixed(2)
  }
  
  function join(arr, separator) {
    if (!arr || !arr.length) return ''
    return arr.join(separator || ', ')
  }
  
  module.exports = {
    price: price,
    join: join
  }
</wxs>
```

在 WXML 中使用：
```xml
<import src="/utils/format.wxs" />

<text>¥{{format.price(price)}}</text>
<text>{{format.join(specValues, ' ')}}</text>
```

#### 3. 创建数据预处理工具

`utils/dataFormatter.js`：
```javascript
/**
 * 格式化商品数据
 */
function formatProduct(product) {
  return {
    ...product,
    priceText: (product.price / 100).toFixed(2),
    specText: product.specValues ? product.specValues.join(' ') : '',
    // ... 其他格式化
  }
}

/**
 * 格式化订单数据
 */
function formatOrder(order) {
  return {
    ...order,
    totalAmountText: (order.totalAmount / 100).toFixed(2),
    payAmountText: (order.payAmount / 100).toFixed(2),
    items: order.items.map(item => ({
      ...item,
      priceText: (item.price / 100).toFixed(2)
    }))
  }
}

module.exports = {
  formatProduct,
  formatOrder
}
```

#### 4. 添加 ESLint 规则（如果可能）

创建自定义规则检查 WXML 文件：
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-wxml-method-call': 'error'
  }
}
```

#### 5. 代码审查清单

在提交代码前检查：
- [ ] WXML 中没有使用 `.toFixed()`
- [ ] WXML 中没有使用 `.join()`
- [ ] WXML 中没有使用 `.trim()`
- [ ] WXML 中没有使用其他 JavaScript 方法
- [ ] 所有数据格式化都在 JS 中完成
- [ ] `pages/` 和 `miniprogram/pages/` 保持同步

---

## 立即行动清单

### 1. 修复剩余问题 🔧
- [ ] 修复 product.wxml 中的 `.join()`
- [ ] 修复 customer-service.wxml 中的 `.trim()`
- [ ] 同步 `pages/` 和 `miniprogram/pages/` 目录

### 2. 全局检查 🔍
- [ ] 搜索所有 WXML 文件中的方法调用
- [ ] 创建问题清单
- [ ] 逐个修复

### 3. 建立规范 📋
- [ ] 编写 WXML 编码规范文档
- [ ] 创建数据格式化工具函数
- [ ] 添加代码审查清单

### 4. 预防措施 🛡️
- [ ] 团队培训 WXML 限制
- [ ] 建立代码审查流程
- [ ] 考虑使用 WXS 处理简单格式化

---

## 总结

### 为什么问题会重复出现？

1. **代码重复：** 两个目录有相同的文件
2. **修复不完整：** 只修复了部分文件
3. **缺少检查：** 没有全局搜索所有问题
4. **规范缺失：** 没有明确的编码规范

### 如何彻底解决？

1. **立即修复：** 修复所有已知问题
2. **全局检查：** 搜索所有潜在问题
3. **建立规范：** 制定 WXML 编码规范
4. **预防机制：** 代码审查 + 工具检查

### 关键要点

- ✅ 所有数据格式化必须在 JS 中完成
- ✅ WXML 只做简单的数据展示
- ✅ 使用 WXS 处理简单的格式化需求
- ✅ 保持代码目录同步
- ✅ 建立代码审查流程

---

**记住：WXML 不是 JavaScript，不能调用任何方法！** 🚫
