/**
 * API请求封装
 */

const { showLoading, hideLoading } = require('./util.js')
const { handleError, isRetryable } = require('./errorHandler.js')
const { mockApi } = require('./mockData.js')

// 是否使用模拟数据（测试环境不使用云服务时设为 true）
const USE_MOCK_DATA = false

// 请求配置
const REQUEST_CONFIG = {
  maxRetries: 2,           // 最大重试次数
  retryDelay: 1000,        // 重试延迟（毫秒）
  timeout: 10000           // 请求超时时间（毫秒）
}

/**
 * 延迟函数
 * @param {Number} ms 延迟时间（毫秒）
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 云函数调用封装（带重试机制）
 * @param {String} name 云函数名称
 * @param {Object} data 请求数据
 * @param {Object} options 选项
 * @returns {Promise}
 */
const callFunction = (name, data = {}, options = {}) => {
  // 如果使用模拟数据，直接返回模拟结果
  if (USE_MOCK_DATA) {
    if (showLoading && mockApi[name]) {
      showLoading()
      return mockApi[name](data).finally(() => {
        hideLoading()
      })
    }
    return Promise.reject({ code: 404, message: `模拟接口 ${name} 未实现` })
  }

  const {
    showLoad = true,
    retries = REQUEST_CONFIG.maxRetries,
    retryCount = 0,
    timeout = REQUEST_CONFIG.timeout
  } = options

  if (showLoad && retryCount === 0) {
    showLoading()
  }

  return new Promise((resolve, reject) => {
    // 设置超时定时器
    const timeoutId = setTimeout(() => {
      hideLoading()
      const timeoutError = {
        code: 504,
        message: '请求超时',
        type: 'TIMEOUT'
      }
      
      // 如果可以重试且未达到最大重试次数
      if (retryCount < retries) {
        console.log(`[重试] ${name} - 第 ${retryCount + 1} 次重试`)
        delay(REQUEST_CONFIG.retryDelay).then(() => {
          callFunction(name, data, {
            ...options,
            retryCount: retryCount + 1,
            showLoad: false
          }).then(resolve).catch(reject)
        })
      } else {
        handleError(timeoutError, {
          context: { function: name, data, retryCount }
        })
        reject(timeoutError)
      }
    }, timeout)

    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        clearTimeout(timeoutId)
        hideLoading()
        
        if (res.result && res.result.code === 0) {
          resolve(res.result.data)
        } else {
          const error = res.result || { code: 500, message: '请求失败' }
          
          // 记录错误但不显示提示（由业务层决定）
          handleError(error, {
            showMessage: false,
            context: { function: name, data, retryCount }
          })
          
          reject(error)
        }
      },
      fail: (err) => {
        clearTimeout(timeoutId)
        hideLoading()
        
        const error = {
          code: err.errCode || 500,
          message: err.errMsg || '网络请求失败',
          type: 'NETWORK',
          originalError: err
        }
        
        // 判断是否可以重试
        if (isRetryable(error) && retryCount < retries) {
          console.log(`[重试] ${name} - 第 ${retryCount + 1} 次重试`)
          delay(REQUEST_CONFIG.retryDelay).then(() => {
            callFunction(name, data, {
              ...options,
              retryCount: retryCount + 1,
              showLoad: false
            }).then(resolve).catch(reject)
          })
        } else {
          handleError(error, {
            context: { function: name, data, retryCount }
          })
          reject(error)
        }
      }
    })
  })
}

// 用户相关API
const userApi = {
  // 用户登录
  login: (code) => callFunction('login', { code }),
  
  // 获取用户信息
  getUserInfo: () => callFunction('getUserInfo'),
  
  // 获取用户资料（包含会员等级）
  getUserProfile: () => callFunction('getUserProfile', {}, false),
  
  // 更新用户信息
  updateUserInfo: (data) => callFunction('updateUserInfo', data),
  
  // 更新会员等级
  updateMemberLevel: (userId) => callFunction('updateMemberLevel', { userId })
}

// 商品相关API
const productApi = {
  // 获取首页数据
  getHomeData: () => callFunction('getHomeData'),
  
  // 获取商品列表
  getProducts: (params) => callFunction('getProducts', params),
  
  // 获取商品详情
  getProductDetail: (productId) => callFunction('getProductDetail', { productId }),
  
  // 搜索商品
  searchProducts: (keyword) => callFunction('searchProducts', { keyword }),
  
  // 获取商品评价
  getReviews: (productId, filter) => callFunction('getReviews', { productId, filter })
}

// 购物车相关API
const cartApi = {
  // 获取购物车
  getCart: () => callFunction('getCart'),
  
  // 添加到购物车
  addToCart: (data) => callFunction('addToCart', data),
  
  // 更新购物车商品
  updateCartItem: (itemId, quantity) => callFunction('updateCartItem', { itemId, quantity }),
  
  // 删除购物车商品
  deleteCartItem: (itemId) => callFunction('deleteCartItem', { itemId }),
  
  // 清空购物车
  clearCart: () => callFunction('clearCart')
}

// 地址相关API
const addressApi = {
  // 获取地址列表
  getAddresses: () => callFunction('getAddresses'),
  
  // 添加地址
  addAddress: (data) => callFunction('addAddress', data),
  
  // 更新地址
  updateAddress: (addressId, data) => callFunction('updateAddress', { addressId, ...data }),
  
  // 删除地址
  deleteAddress: (addressId) => callFunction('deleteAddress', { addressId })
}

// 订单相关API
const orderApi = {
  // 创建订单
  createOrder: (data) => callFunction('createOrder', data),
  
  // 获取订单列表
  getOrders: (status) => callFunction('getOrders', { status }),
  
  // 获取订单详情
  getOrderDetail: (orderId) => callFunction('getOrderDetail', { orderId }),
  
  // 取消订单
  cancelOrder: (orderId) => callFunction('cancelOrder', { orderId }),
  
  // 确认收货
  confirmOrder: (orderId) => callFunction('confirmOrder', { orderId }),
  
  // 获取物流信息
  getLogistics: (orderId) => callFunction('getLogistics', { orderId })
}

// 支付相关API
const paymentApi = {
  // 创建支付
  createPayment: (orderId) => callFunction('createPayment', { orderId }),
  
  // 查询支付状态
  getPaymentStatus: (orderId) => callFunction('getPaymentStatus', { orderId })
}

// 评价相关API
const reviewApi = {
  // 提交评价
  submitReview: (data) => callFunction('submitReview', data)
}

// 收藏相关API
const favoriteApi = {
  // 添加收藏
  addFavorite: (productId) => callFunction('addFavorite', { productId }),
  
  // 取消收藏
  removeFavorite: (productId) => callFunction('removeFavorite', { productId }),
  
  // 获取收藏列表
  getFavorites: () => callFunction('getFavorites')
}

// 优惠券相关API
const couponApi = {
  // 获取优惠券列表
  getCoupons: () => callFunction('getCoupons'),
  
  // 领取优惠券
  claimCoupon: (couponId) => callFunction('claimCoupon', { couponId }),
  
  // 获取用户优惠券
  getUserCoupons: () => callFunction('getUserCoupons'),
  
  // 获取可用优惠券
  getAvailableCoupons: (amount) => callFunction('getAvailableCoupons', { amount })
}

// 拼团相关API
const groupApi = {
  // 获取拼团活动列表
  getGroupActivities: () => callFunction('getGroupActivities'),
  
  // 获取拼团详情
  getGroupDetail: (groupId) => callFunction('getGroupDetail', { groupId }),
  
  // 发起拼团
  createGroup: (activityId) => callFunction('createGroup', { activityId }),
  
  // 参与拼团
  joinGroup: (groupId) => callFunction('joinGroup', { groupId })
}

module.exports = {
  callFunction,
  userApi,
  productApi,
  cartApi,
  addressApi,
  orderApi,
  paymentApi,
  reviewApi,
  favoriteApi,
  couponApi,
  groupApi
}
