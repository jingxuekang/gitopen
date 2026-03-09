/**
 * 错误处理使用示例
 * 
 * 本文件展示了如何在页面中使用错误处理功能
 */

const { productApi } = require('./api.js')
const { handleError } = require('./errorHandler.js')
const { retryRequest } = require('./retry.js')

// ============================================
// 示例1: 基本错误处理
// ============================================
const example1_basicErrorHandling = async () => {
  try {
    const products = await productApi.getProducts({ category: 'tea' })
    console.log('商品列表', products)
  } catch (error) {
    // 自动显示用户友好的错误提示并记录日志
    handleError(error, {
      context: { page: 'product-list', action: 'load' }
    })
  }
}

// ============================================
// 示例2: 自定义错误提示
// ============================================
const example2_customErrorMessage = async () => {
  try {
    const products = await productApi.getProducts({ category: 'tea' })
    console.log('商品列表', products)
  } catch (error) {
    // 不显示默认提示，使用自定义提示
    handleError(error, {
      showMessage: false,
      context: { page: 'product-list' }
    })
    
    // 显示自定义提示
    wx.showToast({
      title: '商品加载失败',
      icon: 'none'
    })
  }
}

// ============================================
// 示例3: 手动重试
// ============================================
const example3_manualRetry = async () => {
  try {
    // 使用重试工具函数
    const products = await retryRequest(
      () => productApi.getProducts({ category: 'tea' }),
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          console.log(`正在重试... (${attempt}/3)`)
        }
      }
    )
    console.log('商品列表', products)
  } catch (error) {
    handleError(error, {
      context: { page: 'product-list', retried: true }
    })
  }
}

// ============================================
// 示例4: 在页面中使用（完整示例）
// ============================================
const pageExample = {
  data: {
    products: [],
    loading: false,
    error: false,
    errorMessage: ''
  },

  onLoad() {
    this.loadProducts()
  },

  /**
   * 加载商品列表
   */
  async loadProducts() {
    this.setData({
      loading: true,
      error: false
    })

    try {
      const products = await productApi.getProducts({ category: 'tea' })
      this.setData({
        products,
        loading: false
      })
    } catch (error) {
      // 处理错误
      const parsedError = handleError(error, {
        showMessage: false, // 不显示toast，使用页面内错误提示
        context: { page: 'product-list' }
      })

      this.setData({
        loading: false,
        error: true,
        errorMessage: parsedError.message
      })
    }
  },

  /**
   * 重试加载
   */
  onRetry() {
    this.loadProducts()
  }
}

// ============================================
// 示例5: 批量请求错误处理
// ============================================
const example5_batchRequests = async () => {
  try {
    // 并发请求多个接口
    const [products, categories, banners] = await Promise.all([
      productApi.getProducts({ category: 'tea' }),
      productApi.getCategories(),
      productApi.getBanners()
    ])

    console.log('数据加载成功', { products, categories, banners })
  } catch (error) {
    // 任何一个请求失败都会被捕获
    handleError(error, {
      context: { page: 'home', action: 'load-all' }
    })
  }
}

// ============================================
// 示例6: 错误日志查看
// ============================================
const example6_viewErrorLogs = () => {
  const { getErrorLogs, clearErrorLogs } = require('./errorHandler.js')
  
  // 获取错误日志
  const logs = getErrorLogs()
  console.log('错误日志', logs)
  
  // 清空错误日志
  clearErrorLogs()
}

// ============================================
// 示例7: 在WXML中使用错误提示组件
// ============================================
/*
<!-- 在页面的WXML中 -->
<view class="container">
  <!-- 加载中 -->
  <view wx:if="{{loading}}">加载中...</view>
  
  <!-- 错误提示 -->
  <error-tip 
    wx:if="{{error}}"
    show="{{error}}"
    message="{{errorMessage}}"
    bind:retry="onRetry"
  />
  
  <!-- 正常内容 -->
  <view wx:if="{{!loading && !error}}">
    <view wx:for="{{products}}" wx:key="id">
      {{item.name}}
    </view>
  </view>
</view>
*/

// ============================================
// 示例8: 在页面JSON中注册错误提示组件
// ============================================
/*
{
  "usingComponents": {
    "error-tip": "/components/error-tip/error-tip"
  }
}
*/

module.exports = {
  example1_basicErrorHandling,
  example2_customErrorMessage,
  example3_manualRetry,
  pageExample,
  example5_batchRequests,
  example6_viewErrorLogs
}
