/**
 * 重试工具函数
 */

const { isRetryable } = require('./errorHandler.js')

/**
 * 延迟函数
 * @param {Number} ms 延迟时间（毫秒）
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 带重试的异步操作
 * @param {Function} fn 要执行的异步函数
 * @param {Object} options 配置选项
 * @returns {Promise}
 */
const retryAsync = async (fn, options = {}) => {
  const {
    maxRetries = 2,           // 最大重试次数
    retryDelay = 1000,        // 重试延迟（毫秒）
    onRetry = null,           // 重试回调函数
    shouldRetry = isRetryable // 判断是否应该重试的函数
  } = options

  let lastError = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error
      
      // 判断是否应该重试
      const canRetry = shouldRetry(error)
      const hasMoreAttempts = attempt < maxRetries
      
      if (canRetry && hasMoreAttempts) {
        console.log(`[重试] 第 ${attempt + 1} 次重试`)
        
        // 调用重试回调
        if (onRetry) {
          onRetry(attempt + 1, error)
        }
        
        // 等待后重试
        await delay(retryDelay * (attempt + 1)) // 递增延迟
      } else {
        throw lastError
      }
    }
  }
  
  throw lastError
}

/**
 * 带重试的网络请求
 * @param {Function} requestFn 请求函数
 * @param {Object} options 配置选项
 * @returns {Promise}
 */
const retryRequest = (requestFn, options = {}) => {
  return retryAsync(requestFn, {
    maxRetries: 2,
    retryDelay: 1000,
    shouldRetry: (error) => {
      // 网络错误或超时错误才重试
      return isRetryable(error)
    },
    ...options
  })
}

/**
 * 指数退避重试
 * @param {Function} fn 要执行的异步函数
 * @param {Object} options 配置选项
 * @returns {Promise}
 */
const exponentialBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry = null
  } = options

  let lastError = null
  let currentDelay = initialDelay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries && isRetryable(error)) {
        console.log(`[指数退避重试] 第 ${attempt + 1} 次重试，延迟 ${currentDelay}ms`)
        
        if (onRetry) {
          onRetry(attempt + 1, error, currentDelay)
        }
        
        await delay(currentDelay)
        
        // 计算下次延迟时间（指数增长）
        currentDelay = Math.min(currentDelay * factor, maxDelay)
      } else {
        throw lastError
      }
    }
  }
  
  throw lastError
}

module.exports = {
  retryAsync,
  retryRequest,
  exponentialBackoff,
  delay
}
