# 错误处理系统文档

## 概述

本项目实现了完善的错误处理系统，包括：
- 全局错误拦截器
- 网络错误自动重试机制
- 用户友好的错误提示
- 错误日志记录

## 核心模块

### 1. errorHandler.js - 错误处理核心模块

提供统一的错误处理、日志记录和用户提示功能。

#### 主要功能

- **错误分类**：将错误分为网络错误、认证错误、业务错误、系统错误、超时错误
- **错误解析**：将各种错误格式统一解析为标准格式
- **用户友好提示**：将技术错误转换为用户可理解的提示
- **错误日志记录**：自动记录错误日志到本地存储
- **特殊错误处理**：如认证错误自动跳转登录页

#### 使用方法

```javascript
const { handleError } = require('./utils/errorHandler.js')

try {
  const result = await someAsyncOperation()
} catch (error) {
  // 自动显示用户友好提示并记录日志
  handleError(error, {
    context: { page: 'product-list', action: 'load' }
  })
}
```

### 2. api.js - API请求封装（增强版）

增强的API请求模块，内置自动重试机制。

#### 主要特性

- **自动重试**：网络错误和超时错误自动重试（最多2次）
- **超时控制**：请求超时时间为10秒
- **递增延迟**：重试时使用递增延迟策略
- **错误处理**：集成错误处理模块

#### 配置选项

```javascript
const REQUEST_CONFIG = {
  maxRetries: 2,           // 最大重试次数
  retryDelay: 1000,        // 重试延迟（毫秒）
  timeout: 10000           // 请求超时时间（毫秒）
}
```

### 3. retry.js - 重试工具模块

提供灵活的重试工具函数。

#### 主要函数

**retryAsync** - 通用异步重试
```javascript
const { retryAsync } = require('./utils/retry.js')

const result = await retryAsync(
  async () => {
    // 你的异步操作
    return await someOperation()
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`重试第 ${attempt} 次`)
    }
  }
)
```

**retryRequest** - 网络请求重试
```javascript
const { retryRequest } = require('./utils/retry.js')

const result = await retryRequest(
  () => productApi.getProducts({ category: 'tea' }),
  { maxRetries: 3 }
)
```

**exponentialBackoff** - 指数退避重试
```javascript
const { exponentialBackoff } = require('./utils/retry.js')

const result = await exponentialBackoff(
  async () => await someOperation(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2
  }
)
```

### 4. error-tip 组件 - 错误提示组件

可复用的错误提示UI组件。

#### 使用方法

1. 在页面JSON中注册组件：
```json
{
  "usingComponents": {
    "error-tip": "/components/error-tip/error-tip"
  }
}
```

2. 在WXML中使用：
```xml
<error-tip 
  show="{{error}}"
  message="{{errorMessage}}"
  showRetry="{{true}}"
  bind:retry="onRetry"
/>
```

3. 在JS中处理：
```javascript
Page({
  data: {
    error: false,
    errorMessage: ''
  },

  async loadData() {
    try {
      const data = await api.getData()
      this.setData({ error: false })
    } catch (error) {
      const parsedError = handleError(error, { showMessage: false })
      this.setData({
        error: true,
        errorMessage: parsedError.message
      })
    }
  },

  onRetry() {
    this.loadData()
  }
})
```

## 全局错误拦截

在 `app.js` 中已配置全局错误监听：

```javascript
// 监听小程序错误
wx.onError((error) => {
  handleError({
    code: 500,
    message: '程序运行异常',
    stack: error
  })
})

// 监听未处理的Promise拒绝
wx.onUnhandledRejection((res) => {
  handleError({
    code: 500,
    message: '异步操作失败',
    stack: res.reason
  })
})
```

## 错误类型

系统定义了以下错误类型：

| 错误类型 | 说明 | 用户提示 | 是否可重试 |
|---------|------|---------|-----------|
| NETWORK | 网络错误 | 网络连接失败，请检查网络设置 | 是 |
| AUTH | 认证错误 | 请先登录 | 否 |
| BUSINESS | 业务错误 | 操作失败，请重试 | 否 |
| SYSTEM | 系统错误 | 系统繁忙，请稍后重试 | 否 |
| TIMEOUT | 超时错误 | 请求超时，请稍后重试 | 是 |

## 错误码映射

| HTTP状态码 | 错误类型 | 默认提示 |
|-----------|---------|---------|
| 400 | BUSINESS | 请求参数错误 |
| 401 | AUTH | 请先登录 |
| 403 | AUTH | 无权限访问 |
| 404 | BUSINESS | 资源不存在 |
| 409 | BUSINESS | 资源冲突 |
| 422 | BUSINESS | 业务处理失败 |
| 500 | SYSTEM | 服务器内部错误 |
| 502 | NETWORK | 网关错误 |
| 503 | SYSTEM | 服务暂时不可用 |
| 504 | TIMEOUT | 请求超时 |

## 错误日志

### 查看错误日志

```javascript
const { getErrorLogs } = require('./utils/errorHandler.js')

const logs = getErrorLogs()
console.log('错误日志', logs)
```

### 清空错误日志

```javascript
const { clearErrorLogs } = require('./utils/errorHandler.js')

clearErrorLogs()
```

### 日志格式

```javascript
{
  timestamp: "2024-01-01T12:00:00.000Z",
  type: "NETWORK",
  code: 504,
  message: "请求超时",
  stack: "...",
  context: {
    function: "getProducts",
    data: { category: "tea" },
    retryCount: 2
  }
}
```

## 最佳实践

### 1. 页面加载数据

```javascript
Page({
  data: {
    loading: false,
    error: false,
    errorMessage: '',
    data: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true, error: false })

    try {
      const data = await api.getData()
      this.setData({ data, loading: false })
    } catch (error) {
      const parsedError = handleError(error, { showMessage: false })
      this.setData({
        loading: false,
        error: true,
        errorMessage: parsedError.message
      })
    }
  },

  onRetry() {
    this.loadData()
  }
})
```

### 2. 表单提交

```javascript
async onSubmit(e) {
  const formData = e.detail.value

  try {
    await api.submitForm(formData)
    wx.showToast({ title: '提交成功', icon: 'success' })
    wx.navigateBack()
  } catch (error) {
    // 显示默认错误提示
    handleError(error)
  }
}
```

### 3. 批量请求

```javascript
async loadPageData() {
  try {
    const [products, categories, banners] = await Promise.all([
      api.getProducts(),
      api.getCategories(),
      api.getBanners()
    ])

    this.setData({ products, categories, banners })
  } catch (error) {
    handleError(error, {
      context: { page: 'home', action: 'load-all' }
    })
  }
}
```

### 4. 需要重试的关键操作

```javascript
const { retryRequest } = require('./utils/retry.js')

async createOrder(orderData) {
  try {
    // 订单创建是关键操作，使用重试机制
    const order = await retryRequest(
      () => api.createOrder(orderData),
      {
        maxRetries: 3,
        onRetry: (attempt) => {
          wx.showToast({
            title: `正在重试... (${attempt}/3)`,
            icon: 'loading'
          })
        }
      }
    )

    return order
  } catch (error) {
    handleError(error, {
      context: { action: 'create-order', orderData }
    })
    throw error
  }
}
```

## 注意事项

1. **不要过度重试**：只对网络错误和超时错误进行重试，业务错误不应重试
2. **合理设置重试次数**：默认最多重试2次，避免给服务器造成过大压力
3. **记录错误上下文**：在 `handleError` 时提供 `context` 信息，便于问题排查
4. **用户体验优先**：使用页面内错误提示而非频繁的toast提示
5. **错误日志定期清理**：错误日志最多保存50条，会自动清理旧日志

## 测试建议

1. **网络错误测试**：在开发者工具中模拟弱网环境
2. **超时测试**：设置较短的超时时间测试超时处理
3. **业务错误测试**：模拟各种业务错误场景（库存不足、权限不足等）
4. **重试测试**：验证重试机制是否正常工作
5. **日志测试**：验证错误日志是否正确记录

## 扩展建议

1. **错误上报**：将错误日志上报到服务器进行分析
2. **错误统计**：统计各类错误的发生频率
3. **用户反馈**：提供错误反馈入口，让用户报告问题
4. **降级策略**：关键功能失败时提供降级方案
5. **监控告警**：错误率超过阈值时触发告警
