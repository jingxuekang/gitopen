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

const LOCAL_CART_KEY = 'cart'
const requestQueue = new Map()

const normalizeNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const buildFallbackSpecValues = (product = {}) => {
  const values = []
  const addSpec = (label, value) => {
    if (value === undefined || value === null) return
    const text = String(value).trim()
    if (!text) return
    values.push(`${label}:${text}`)
  }

  if (product.category === 'teapot') {
    addSpec('壶型', product.subCategory)
    addSpec('泥料', product.material)
    addSpec('工艺', product.craftType || product.craft)
    addSpec('容量', product.capacity)
  } else if (product.category === 'chenpi') {
    addSpec('产区', product.subCategory || product.origin)
    addSpec('年份', product.year)
    addSpec('净含量', product.weight)
  } else {
    addSpec('品类', product.subCategory)
    addSpec('年份', product.year)
    addSpec('净含量', product.weight)
  }

  if (values.length === 0) values.push('默认规格:标准')
  return [...new Set(values)]
}

const withSkuFallback = (product) => {
  if (!product || typeof product !== 'object') return product

  const basePrice = normalizeNumber(product.price, 0)
  const baseStock = normalizeNumber(product.stock, 0)
  const defaultSkuCode = `DEFAULT_${product._id || 'SKU'}`
  const sourceSkus = Array.isArray(product.skus) ? product.skus : []

  const skus = sourceSkus.length > 0
    ? sourceSkus.map((sku, index) => ({
      ...sku,
      skuCode: sku && sku.skuCode ? sku.skuCode : `${defaultSkuCode}_${index}`,
      specValues: Array.isArray(sku && sku.specValues) && sku.specValues.length > 0
        ? sku.specValues
        : ['默认规格:标准'],
      price: normalizeNumber(sku && sku.price, basePrice),
      stock: normalizeNumber(sku && sku.stock, baseStock)
    }))
    : [{
      skuCode: defaultSkuCode,
      specValues: buildFallbackSpecValues(product),
      price: basePrice,
      stock: baseStock
    }]

  return {
    ...product,
    skus
  }
}

const getErrorText = (err) => {
  return [
    err && err.message,
    err && err.error,
    err && err.errMsg,
    err && err.originalError && err.originalError.errMsg
  ].filter(Boolean).join(' | ')
}

const isCartCollectionMissing = (err) => {
  const text = getErrorText(err)
  return (
    text.includes('DATABASE_COLLECTION_NOT_EXIST') &&
    text.includes('cart_items')
  ) || text.includes('Db or Table not exist: cart_items')
}

const isCartFunctionMissing = (err) => {
  const text = getErrorText(err)
  return text.includes('FUNCTION_NOT_FOUND') ||
    text.includes('function not exists') ||
    text.includes('FunctionName')
}

const shouldUseLocalCartFallback = (err) => {
  return isCartCollectionMissing(err) || isCartFunctionMissing(err)
}

const getLocalCart = () => {
  const cart = wx.getStorageSync(LOCAL_CART_KEY)
  return Array.isArray(cart) ? cart : []
}

const saveLocalCart = (cart = []) => {
  wx.setStorageSync(LOCAL_CART_KEY, Array.isArray(cart) ? cart : [])
}

const buildSpecText = (sku = {}) => {
  const values = Array.isArray(sku.specValues) ? sku.specValues : []
  return values.filter(Boolean).join(' ')
}

const resolveLocalCartMeta = async ({
  productId,
  skuCode,
  productName,
  productImage,
  price,
  specText,
  stock
} = {}) => {
  const normalized = {
    productName: productName || '',
    productImage: productImage || '',
    price: normalizeNumber(price, 0),
    specText: specText || '',
    stock: normalizeNumber(stock, 0)
  }

  const hasEnoughMeta = normalized.productName && normalized.price > 0
  if (hasEnoughMeta || !productId) {
    return normalized
  }

  try {
    const db = wx.cloud.database()
    const result = await db.collection('products').doc(productId).get()
    const product = result && result.data ? withSkuFallback(result.data) : null
    if (!product) return normalized

    const skus = Array.isArray(product.skus) ? product.skus : []
    const matchedSku = skus.find((item) => item && item.skuCode === skuCode) || skus[0] || {}

    return {
      productName: normalized.productName || product.name || '商品',
      productImage: normalized.productImage || (Array.isArray(product.images) ? product.images[0] : '') || '',
      price: normalized.price > 0 ? normalized.price : normalizeNumber(matchedSku.price, normalizeNumber(product.price, 0)),
      specText: normalized.specText || buildSpecText(matchedSku),
      stock: normalized.stock > 0 ? normalized.stock : normalizeNumber(matchedSku.stock, normalizeNumber(product.stock, 999))
    }
  } catch (err) {
    console.warn('resolveLocalCartMeta 读取商品信息失败', err)
    return normalized
  }
}

const addToLocalCart = async ({
  productId,
  skuCode,
  quantity = 1,
  productName,
  productImage,
  price,
  specText,
  stock
} = {}) => {
  if (!productId || !skuCode) {
    throw new Error('商品ID和SKU不能为空')
  }

  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1))
  const meta = await resolveLocalCartMeta({
    productId,
    skuCode,
    productName,
    productImage,
    price,
    specText,
    stock
  })
  const cart = getLocalCart()
  const index = cart.findIndex((item) => item.productId === productId && item.skuCode === skuCode)

  if (index >= 0) {
    const currentQty = Math.max(0, Number(cart[index].quantity) || 0)
    cart[index] = {
      ...cart[index],
      ...meta,
      quantity: currentQty + safeQuantity,
      updatedAt: new Date().toISOString()
    }
  } else {
    cart.push({
      id: `local_${Date.now()}`,
      productId,
      skuCode,
      quantity: safeQuantity,
      selected: true,
      ...meta,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      localOnly: true
    })
  }

  saveLocalCart(cart)
  return {
    localFallback: true,
    quantity: safeQuantity
  }
}

const buildLocalCartResult = () => {
  const cart = getLocalCart()
  const items = cart.map((item) => ({
    _id: item.id || `local_${item.productId}_${item.skuCode}`,
    productId: item.productId,
    skuCode: item.skuCode,
    quantity: Math.max(1, Number(item.quantity) || 1),
    selected: item.selected !== false,
    localOnly: true,
    productName: item.productName || '商品',
    productImage: item.productImage || '',
    price: Number(item.price) || 0,
    stock: Number(item.stock) || 999,
    specText: item.specText || '',
    available: true,
    subtotal: (Number(item.price) || 0) * (Math.max(1, Number(item.quantity) || 1))
  }))

  const totalPrice = items
    .filter((item) => item.selected && item.available)
    .reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)

  const selectedCount = items.filter((item) => item.selected).length

  return {
    items,
    totalPrice,
    selectedCount,
    localFallback: true
  }
}

const getLocalCartItemId = (item = {}) => {
  if (item.id) return item.id
  if (item.productId && item.skuCode) return `local_${item.productId}_${item.skuCode}`
  return ''
}

const findLocalCartIndexById = (cart = [], cartItemId = '') => {
  return cart.findIndex((item) => getLocalCartItemId(item) === cartItemId)
}

const updateLocalCartItem = ({ cartItemId, quantity, selected } = {}) => {
  if (!cartItemId) {
    throw new Error('购物车商品ID不能为空')
  }

  const cart = getLocalCart()
  const index = findLocalCartIndexById(cart, cartItemId)
  if (index < 0) {
    throw new Error('购物车商品不存在')
  }

  const current = cart[index]
  const next = { ...current }

  if (quantity !== undefined) {
    const safeQuantity = Math.floor(normalizeNumber(quantity, 0))
    if (safeQuantity <= 0) {
      throw { code: 400, message: '数量必须大于0' }
    }

    const safeStock = normalizeNumber(current.stock, 0)
    if (safeStock > 0 && safeQuantity > safeStock) {
      throw { code: 409, message: '库存不足' }
    }
    next.quantity = safeQuantity
  }

  if (selected !== undefined) {
    next.selected = !!selected
  }

  next.updatedAt = new Date().toISOString()
  cart[index] = next
  saveLocalCart(cart)

  return {
    cartItemId,
    quantity: next.quantity,
    selected: next.selected,
    localFallback: true
  }
}

const deleteLocalCartItem = ({ cartItemId, cartItemIds } = {}) => {
  const ids = Array.isArray(cartItemIds)
    ? cartItemIds.filter(Boolean)
    : [cartItemId].filter(Boolean)

  if (ids.length === 0) {
    throw new Error('请提供要删除的商品ID')
  }

  const cart = getLocalCart()
  const nextCart = cart.filter((item) => !ids.includes(getLocalCartItemId(item)))
  saveLocalCart(nextCart)

  return {
    deletedCount: cart.length - nextCart.length,
    localFallback: true
  }
}

const clearLocalCart = () => {
  saveLocalCart([])
  return {
    localFallback: true
  }
}

const buildRequestKey = (name, data = {}) => {
  return `${name}_${JSON.stringify(data || {})}`
}

const shouldDedupeRequest = (name, options = {}) => {
  const { dedupe, retryCount = 0 } = options
  if (retryCount > 0) return false
  if (typeof dedupe === 'boolean') return dedupe
  return /^get[A-Z]/.test(name)
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
  const normalizedOptions = options && typeof options === 'object' ? options : {}

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
    timeout = REQUEST_CONFIG.timeout,
    silent = false
  } = normalizedOptions

  const enableDedupe = shouldDedupeRequest(name, { ...normalizedOptions, retryCount })
  const requestKey = enableDedupe ? buildRequestKey(name, data) : ''

  if (enableDedupe && requestQueue.has(requestKey)) {
    return requestQueue.get(requestKey)
  }

  if (showLoad && retryCount === 0) {
    showLoading()
  }

  const requestPromise = new Promise((resolve, reject) => {
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
            ...normalizedOptions,
            retryCount: retryCount + 1,
            showLoad: false
          }).then(resolve).catch(reject)
        })
      } else {
        if (!silent) {
          handleError(timeoutError, {
            context: { function: name, data, retryCount }
          })
        }
        reject(timeoutError)
      }
    }, timeout)

    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        clearTimeout(timeoutId)
        hideLoading()
        
        // 双协议兼容：code===0 或 success===true 均视为成功
        const ok = res.result && (res.result.code === 0 || res.result.success === true)
        if (ok) {
          resolve(res.result.data !== undefined ? res.result.data : res.result)
        } else {
          const error = res.result || { code: 500, message: '请求失败' }
          
          // 记录错误但不显示提示（由业务层决定）
          if (!silent) {
            handleError(error, {
              showMessage: false,
              context: { function: name, data, retryCount }
            })
          }
          
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
              ...normalizedOptions,
              retryCount: retryCount + 1,
              showLoad: false
            }).then(resolve).catch(reject)
          })
        } else {
          if (!silent) {
            handleError(error, {
              context: { function: name, data, retryCount }
            })
          }
          reject(error)
        }
      }
    })
  })

  if (!enableDedupe) {
    return requestPromise
  }

  const dedupedPromise = requestPromise.finally(() => {
    requestQueue.delete(requestKey)
  })
  requestQueue.set(requestKey, dedupedPromise)
  return dedupedPromise
}

// 用户相关API
const userApi = {
  // 用户登录
  login: (code) => callFunction('login', { code }),
  
  // 获取用户信息
  getUserInfo: () => callFunction('getUserInfo'),
  
  // 获取用户资料（包含会员等级）
  getUserProfile: () => callFunction('getUserProfile', {}, { showLoad: false }),
  
  // 更新用户信息
  updateUserInfo: (data) => callFunction('updateUserInfo', data),
  
  // 更新会员等级
  updateMemberLevel: (userId) => callFunction('updateMemberLevel', { userId })
}

// 商品相关API
const productApi = {
  // 获取首页数据
  getHomeData: async () => {
    const data = await callFunction('getHomeData')
    if (!data || typeof data !== 'object') return data

    const normalizedData = { ...data }
    if (Array.isArray(normalizedData.products)) {
      normalizedData.products = normalizedData.products.map(withSkuFallback)
    }
    if (Array.isArray(normalizedData.hotProducts)) {
      normalizedData.hotProducts = normalizedData.hotProducts.map(withSkuFallback)
    }
    if (Array.isArray(normalizedData.recommendProducts)) {
      normalizedData.recommendProducts = normalizedData.recommendProducts.map(withSkuFallback)
    }
    return normalizedData
  },
  
  // 获取商品列表
  getProducts: async (params) => {
    const data = await callFunction('getProducts', params)
    if (!data || typeof data !== 'object') return data
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list.map(withSkuFallback) : []
    }
  },
  
  // 获取商品详情
  getProductDetail: async (productId) => {
    try {
      // 详情接口失败时有本地兜底读取，不在这里先弹全局系统错误提示
      const data = await callFunction('getProductDetail', { productId }, { silent: true })
      const payload = data && typeof data === 'object' ? data : {}
      return {
        ...payload,
        product: withSkuFallback(payload.product || payload)
      }
    } catch (err) {
      // 云函数未部署/临时异常时兜底读取 products，避免详情页直接空白
      try {
        const db = wx.cloud.database()
        const productResult = await db.collection('products').doc(productId).get()
        if (productResult && productResult.data) {
          return {
            product: withSkuFallback(productResult.data),
            reviews: []
          }
        }
      } catch (fallbackErr) {
        console.warn('getProductDetail 兜底读取失败', fallbackErr)
      }
      throw err
    }
  },
  
  // 搜索商品
  searchProducts: (keyword) => callFunction('searchProducts', { keyword }),
  
  // 获取商品评价
  getReviews: (productId, filter) => callFunction('getReviews', { productId, filter })
}

// 购物车相关API
const cartApi = {
  // 获取购物车
  getCart: async () => {
    try {
      return await callFunction('getCart', {}, { silent: true })
    } catch (err) {
      if (shouldUseLocalCartFallback(err)) {
        console.warn('getCart 云端购物车不可用，已回退本地购物车')
        return buildLocalCartResult()
      }
      throw err
    }
  },
  
  // 添加到购物车
  addToCart: async (data) => {
    try {
      return await callFunction('addToCart', data, { silent: true })
    } catch (err) {
      if (shouldUseLocalCartFallback(err)) {
        console.warn('addToCart 云端购物车不可用，已回退本地购物车')
        return await addToLocalCart(data)
      }
      throw err
    }
  },
  
  // 更新购物车商品
  updateCartItem: async (cartItemId, payload) => {
    const data = payload && typeof payload === 'object'
      ? { cartItemId, ...payload }
      : { cartItemId, quantity: payload }
    try {
      return await callFunction('updateCartItem', data, { silent: true })
    } catch (err) {
      if (shouldUseLocalCartFallback(err)) {
        console.warn('updateCartItem 云端购物车不可用，已回退本地购物车')
        return updateLocalCartItem(data)
      }
      throw err
    }
  },
  
  // 删除购物车商品
  deleteCartItem: async (target) => {
    const data = Array.isArray(target)
      ? { cartItemIds: target }
      : { cartItemId: target }
    try {
      return await callFunction('deleteCartItem', data, { silent: true })
    } catch (err) {
      if (shouldUseLocalCartFallback(err)) {
        console.warn('deleteCartItem 云端购物车不可用，已回退本地购物车')
        return deleteLocalCartItem(data)
      }
      throw err
    }
  },
  
  // 清空购物车
  clearCart: async () => {
    try {
      return await callFunction('clearCart', {}, { silent: true })
    } catch (err) {
      if (shouldUseLocalCartFallback(err)) {
        return clearLocalCart()
      }
      throw err
    }
  }
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
  getFavoriteErrorText(err) {
    return [
      err && err.message,
      err && err.error,
      err && err.errMsg,
      err && err.originalError && err.originalError.errMsg
    ].filter(Boolean).join(' | ')
  },

  isMissingFavoriteResource(err) {
    const text = this.getFavoriteErrorText(err)
    return text.includes('DATABASE_COLLECTION_NOT_EXIST') ||
      text.includes('collection not exists') ||
      text.includes('FUNCTION_NOT_FOUND') ||
      text.includes('FunctionName') ||
      text.includes('function not exists')
  },

  isNotFavoritedError(err) {
    const text = this.getFavoriteErrorText(err)
    return (err && Number(err.code) === 404) || text.includes('未收藏该商品')
  },

  // 添加收藏
  addFavorite: async (productId) => {
    try {
      return await callFunction('addFavorite', { productId })
    } catch (err) {
      // 收藏表或云函数缺失时，交给页面本地收藏兜底，不阻断用户操作
      if (favoriteApi.isMissingFavoriteResource(err)) {
        console.warn('addFavorite 云端不可用，已回退本地收藏', favoriteApi.getFavoriteErrorText(err))
        return { localFallback: true }
      }
      throw err
    }
  },
  
  // 取消收藏
  removeFavorite: async (productId) => {
    try {
      return await callFunction('removeFavorite', { productId })
    } catch (err) {
      // 取消收藏幂等：云端返回“未收藏”视为成功，避免本地/云端状态短暂不一致导致失败提示
      if (favoriteApi.isNotFavoritedError(err)) {
        return { alreadyRemoved: true }
      }

      // 收藏表或云函数缺失时，交给页面本地收藏兜底，不阻断用户操作
      if (favoriteApi.isMissingFavoriteResource(err)) {
        console.warn('removeFavorite 云端不可用，已回退本地收藏', favoriteApi.getFavoriteErrorText(err))
        return { localFallback: true }
      }
      throw err
    }
  },
  
  // 获取收藏列表
  getFavorites: async () => {
    try {
      const data = await callFunction('getFavorites', {}, { showLoad: false, silent: true })
      const list = Array.isArray(data) ? data : []
      return list.map((item) => {
        if (!item || typeof item !== 'object') return item
        if (item.product) {
          return {
            ...item,
            product: withSkuFallback(item.product)
          }
        }
        if (item.productInfo) {
          return {
            ...item,
            productInfo: withSkuFallback(item.productInfo)
          }
      }
      return item
      })
    } catch (err) {
      if (favoriteApi.isMissingFavoriteResource(err)) {
        console.warn('getFavorites 云端不可用，已返回空收藏列表')
        return []
      }
      throw err
    }
  }
}

// 优惠券相关API
const couponApi = {
  getCouponErrorText(err) {
    return [
      err && err.message,
      err && err.error,
      err && err.errMsg,
      err && err.originalError && err.originalError.errMsg
    ].filter(Boolean).join(' | ')
  },

  isMissingCouponResource(err) {
    const text = this.getCouponErrorText(err)
    return text.includes('DATABASE_COLLECTION_NOT_EXIST') ||
      text.includes('collection not exists') ||
      text.includes('FUNCTION_NOT_FOUND') ||
      text.includes('function not exists') ||
      text.includes('FunctionName')
  },

  // 获取优惠券列表
  getCoupons: async () => {
    try {
      const data = await callFunction('getCoupons', {}, { silent: true })
      return Array.isArray(data) ? data : []
    } catch (err) {
      if (couponApi.isMissingCouponResource(err)) return []
      throw err
    }
  },
  
  // 领取优惠券
  claimCoupon: (couponId) => callFunction('claimCoupon', { couponId }),
  
  // 获取用户优惠券
  getUserCoupons: async () => {
    try {
      const data = await callFunction('getUserCoupons', {}, { silent: true })
      return Array.isArray(data) ? data : []
    } catch (err) {
      if (couponApi.isMissingCouponResource(err)) return []
      throw err
    }
  },
  
  // 获取可用优惠券
  getAvailableCoupons: async (totalAmount = 0) => {
    try {
      const data = await callFunction('getAvailableCoupons', { totalAmount }, { silent: true })
      return Array.isArray(data) ? data : []
    } catch (err) {
      if (couponApi.isMissingCouponResource(err)) return []
      throw err
    }
  }
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
