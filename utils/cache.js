/**
 * 本地缓存工具
 */

const CACHE_KEYS = {
  HOME_DATA: 'cache_home_data',
  PRODUCTS: 'cache_products',
  CATEGORIES: 'cache_categories'
}

const CACHE_EXPIRE = {
  [CACHE_KEYS.HOME_DATA]: 5 * 60 * 1000,
  [CACHE_KEYS.PRODUCTS]: 10 * 60 * 1000,
  [CACHE_KEYS.CATEGORIES]: 30 * 60 * 1000
}

const DEFAULT_EXPIRE = 5 * 60 * 1000

const resolveExpire = (key, expire) => {
  if (Number.isFinite(expire) && expire > 0) {
    return expire
  }
  return CACHE_EXPIRE[key] || DEFAULT_EXPIRE
}

const setCache = (key, data, expire) => {
  if (!key) return
  const payload = {
    data,
    timestamp: Date.now(),
    expire: resolveExpire(key, expire)
  }
  wx.setStorageSync(key, payload)
}

const getCache = (key) => {
  if (!key) return null
  try {
    const payload = wx.getStorageSync(key)
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const timestamp = Number(payload.timestamp)
    const expire = Number(payload.expire)
    if (!Number.isFinite(timestamp) || !Number.isFinite(expire)) {
      wx.removeStorageSync(key)
      return null
    }

    if (Date.now() - timestamp > expire) {
      wx.removeStorageSync(key)
      return null
    }

    return payload.data
  } catch (err) {
    console.warn('[cache] getCache failed', key, err)
    return null
  }
}

const clearCache = (key) => {
  if (key) {
    wx.removeStorageSync(key)
    return
  }
  Object.keys(CACHE_KEYS).forEach((cacheKeyName) => {
    wx.removeStorageSync(CACHE_KEYS[cacheKeyName])
  })
}

module.exports = {
  CACHE_KEYS,
  CACHE_EXPIRE,
  setCache,
  getCache,
  clearCache
}
