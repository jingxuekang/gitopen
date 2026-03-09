/**
 * 全局错误处理模块
 */

const { showToast } = require('./util.js')

// 错误类型枚举
const ErrorType = {
  NETWORK: 'NETWORK',           // 网络错误
  AUTH: 'AUTH',                 // 认证错误
  BUSINESS: 'BUSINESS',         // 业务逻辑错误
  SYSTEM: 'SYSTEM',             // 系统错误
  TIMEOUT: 'TIMEOUT'            // 超时错误
}

// 错误码映射
const ErrorCodeMap = {
  // 客户端错误
  400: { type: ErrorType.BUSINESS, message: '请求参数错误' },
  401: { type: ErrorType.AUTH, message: '请先登录' },
  403: { type: ErrorType.AUTH, message: '无权限访问' },
  404: { type: ErrorType.BUSINESS, message: '资源不存在' },
  409: { type: ErrorType.BUSINESS, message: '资源冲突' },
  422: { type: ErrorType.BUSINESS, message: '业务处理失败' },
  
  // 服务器错误
  500: { type: ErrorType.SYSTEM, message: '服务器内部错误' },
  502: { type: ErrorType.NETWORK, message: '网关错误' },
  503: { type: ErrorType.SYSTEM, message: '服务暂时不可用' },
  504: { type: ErrorType.TIMEOUT, message: '请求超时' }
}

// 错误日志队列
let errorLogQueue = []
const MAX_LOG_SIZE = 50

/**
 * 记录错误日志
 * @param {Object} error 错误对象
 */
const logError = (error) => {
  const log = {
    timestamp: new Date().toISOString(),
    type: error.type || ErrorType.SYSTEM,
    code: error.code,
    message: error.message,
    stack: error.stack,
    context: error.context || {}
  }
  
  // 添加到队列
  errorLogQueue.push(log)
  
  // 限制队列大小
  if (errorLogQueue.length > MAX_LOG_SIZE) {
    errorLogQueue.shift()
  }
  
  // 保存到本地存储
  try {
    wx.setStorageSync('error_logs', errorLogQueue)
  } catch (e) {
    console.error('保存错误日志失败', e)
  }
  
  // 开发环境打印详细错误
  if (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop') {
    console.error('[错误日志]', log)
  }
}

/**
 * 获取错误日志
 * @returns {Array} 错误日志列表
 */
const getErrorLogs = () => {
  try {
    return wx.getStorageSync('error_logs') || []
  } catch (e) {
    return []
  }
}

/**
 * 清空错误日志
 */
const clearErrorLogs = () => {
  errorLogQueue = []
  try {
    wx.removeStorageSync('error_logs')
  } catch (e) {
    console.error('清空错误日志失败', e)
  }
}

/**
 * 解析错误信息
 * @param {*} error 错误对象
 * @returns {Object} 标准化的错误对象
 */
const parseError = (error) => {
  // 如果是标准错误响应
  if (error && typeof error === 'object') {
    const code = error.code || error.statusCode || 500
    const errorInfo = ErrorCodeMap[code] || { 
      type: ErrorType.SYSTEM, 
      message: '未知错误' 
    }
    
    return {
      type: errorInfo.type,
      code: code,
      message: error.message || errorInfo.message,
      details: error.details || null,
      stack: error.stack || null
    }
  }
  
  // 字符串错误
  if (typeof error === 'string') {
    return {
      type: ErrorType.SYSTEM,
      code: 500,
      message: error,
      details: null,
      stack: null
    }
  }
  
  // 默认错误
  return {
    type: ErrorType.SYSTEM,
    code: 500,
    message: '系统错误，请稍后重试',
    details: null,
    stack: null
  }
}

/**
 * 获取用户友好的错误提示
 * @param {Object} error 错误对象
 * @returns {String} 用户友好的错误提示
 */
const getUserFriendlyMessage = (error) => {
  const parsedError = parseError(error)
  
  // 根据错误类型返回友好提示
  switch (parsedError.type) {
    case ErrorType.NETWORK:
      return '网络连接失败，请检查网络设置'
    case ErrorType.AUTH:
      return parsedError.message || '请先登录'
    case ErrorType.TIMEOUT:
      return '请求超时，请稍后重试'
    case ErrorType.BUSINESS:
      return parsedError.message || '操作失败，请重试'
    case ErrorType.SYSTEM:
      return '系统繁忙，请稍后重试'
    default:
      return parsedError.message || '操作失败，请重试'
  }
}

/**
 * 全局错误处理器
 * @param {*} error 错误对象
 * @param {Object} options 选项
 * @returns {Object} 处理后的错误对象
 */
const handleError = (error, options = {}) => {
  const {
    showMessage = true,      // 是否显示错误提示
    logError: shouldLog = true,  // 是否记录日志
    context = {}             // 错误上下文信息
  } = options
  
  // 解析错误
  const parsedError = parseError(error)
  parsedError.context = context
  
  // 记录错误日志
  if (shouldLog) {
    logError(parsedError)
  }
  
  // 显示用户友好提示
  if (showMessage) {
    const message = getUserFriendlyMessage(parsedError)
    showToast(message)
  }
  
  // 特殊错误处理
  if (parsedError.type === ErrorType.AUTH) {
    // 认证错误，跳转到登录页
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/index/index'
      })
    }, 1500)
  }
  
  return parsedError
}

/**
 * 判断是否为网络错误
 * @param {*} error 错误对象
 * @returns {Boolean}
 */
const isNetworkError = (error) => {
  if (!error) return false
  
  // 微信API网络错误
  if (error.errMsg && (
    error.errMsg.includes('fail') ||
    error.errMsg.includes('timeout') ||
    error.errMsg.includes('network')
  )) {
    return true
  }
  
  // HTTP状态码判断
  const code = error.code || error.statusCode
  return code === 502 || code === 503 || code === 504
}

/**
 * 判断是否可以重试
 * @param {*} error 错误对象
 * @returns {Boolean}
 */
const isRetryable = (error) => {
  const parsedError = parseError(error)
  
  // 网络错误和超时错误可以重试
  return parsedError.type === ErrorType.NETWORK || 
         parsedError.type === ErrorType.TIMEOUT ||
         isNetworkError(error)
}

module.exports = {
  ErrorType,
  handleError,
  parseError,
  getUserFriendlyMessage,
  isNetworkError,
  isRetryable,
  logError,
  getErrorLogs,
  clearErrorLogs
}
