const { CACHE_KEYS, setCache, getCache, clearCache } = require('../../utils/cache')

describe('utils/cache', () => {
  const storage = {}

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k])
    global.wx = {
      setStorageSync: (k, v) => {
        storage[k] = v
      },
      getStorageSync: (k) => storage[k],
      removeStorageSync: (k) => {
        delete storage[k]
      }
    }
  })

  test('setCache + getCache works', () => {
    setCache(CACHE_KEYS.HOME_DATA, { foo: 'bar' }, 1000)
    expect(getCache(CACHE_KEYS.HOME_DATA)).toEqual({ foo: 'bar' })
  })

  test('expired cache returns null', () => {
    setCache(CACHE_KEYS.HOME_DATA, { foo: 'bar' }, 1)
    const record = storage[CACHE_KEYS.HOME_DATA]
    record.timestamp = Date.now() - 10
    expect(getCache(CACHE_KEYS.HOME_DATA)).toBeNull()
  })

  test('clearCache clears single and all keys', () => {
    setCache(CACHE_KEYS.HOME_DATA, { a: 1 }, 1000)
    setCache(CACHE_KEYS.PRODUCTS, { b: 2 }, 1000)
    clearCache(CACHE_KEYS.HOME_DATA)
    expect(getCache(CACHE_KEYS.HOME_DATA)).toBeNull()
    expect(getCache(CACHE_KEYS.PRODUCTS)).toEqual({ b: 2 })

    clearCache()
    expect(getCache(CACHE_KEYS.PRODUCTS)).toBeNull()
  })
})
