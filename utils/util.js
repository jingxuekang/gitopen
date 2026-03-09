/**
 * 工具函数库
 */

/**
 * 格式化时间
 * @param {Date} date 日期对象
 * @param {String} format 格式化字符串
 * @returns {String} 格式化后的时间字符串
 */
const formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return format
    .replace('YYYY', year)
    .replace('MM', padZero(month))
    .replace('DD', padZero(day))
    .replace('HH', padZero(hour))
    .replace('mm', padZero(minute))
    .replace('ss', padZero(second))
}

/**
 * 数字补零
 */
const padZero = (num) => {
  return num < 10 ? '0' + num : num
}

/**
 * 格式化价格（分转元）
 * @param {Number} price 价格（分）
 * @returns {String} 格式化后的价格
 */
const formatPrice = (price) => {
  return (price / 100).toFixed(2)
}

const SPEC_PINYIN_MAP = {
  tea: '白茶',
  chenpi: '陈皮',
  teapot: '紫砂',
  yinzhen: '银针',
  baihaoyinzhen: '白毫银针',
  baihao_yinzhen: '白毫银针',
  mudan: '牡丹',
  baimudan: '白牡丹',
  bai_mudan: '白牡丹',
  shoumei: '寿眉',
  gongmei: '贡眉',
  garden: '普通茶园',
  base: '基地',
  wild: '荒野',
  tianma: '天马',
  chakeng: '茶坑',
  chajiao: '茶坑',
  meijiang: '梅江',
  meijian: '梅江',
  yixian: '一线',
  xitian: '西甲',
  dongjia: '东甲',
  ziyeshipiao: '子冶石瓢',
  ziye_shipiao: '子冶石瓢',
  shipiao: '石瓢',
  dezhong: '德钟',
  duozhi: '掇只',
  zini: '紫泥',
  putongzini: '普通紫泥',
  dicaoqing: '底槽清',
  di_cao_qing: '底槽清',
  tianqingni: '天青泥',
  hongpilong: '红皮龙',
  duanni: '段泥',
  full: '全手工',
  quan_shougong: '全手工',
  quanshougong: '全手工',
  half: '半手工',
  ban_shougong: '半手工',
  banshougong: '半手工',
  standard: '标准',
  other: '其他'
}

const normalizeSpecValue = (value = '') => {
  const source = String(value || '').trim()
  if (!source) return ''
  return source.replace(/[A-Za-z_]+/g, (rawWord) => {
    const key = rawWord.toLowerCase()
    return SPEC_PINYIN_MAP[key] || rawWord
  })
}

const normalizeSpecText = (text = '') => {
  if (Array.isArray(text)) {
    return text.map((segment) => normalizeSpecText(segment)).join(' ')
  }

  const source = String(text || '').trim()
  if (!source) return ''

  return source
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/^([^:：]+)([:：])(.*)$/)
      if (!match) {
        return normalizeSpecValue(segment)
      }

      const label = match[1]
      const sep = match[2]
      const value = match[3]
      return `${label}${sep}${normalizeSpecValue(value)}`
    })
    .join(' ')
}

/**
 * 价格转分
 * @param {Number} yuan 价格（元）
 * @returns {Number} 价格（分）
 */
const yuanToFen = (yuan) => {
  return Math.round(yuan * 100)
}

/**
 * 显示Toast提示
 * @param {String} title 提示文字
 * @param {String} icon 图标类型
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon,
    duration: 2000
  })
}

/**
 * 显示加载提示
 * @param {String} title 提示文字
 */
let loadingCount = 0

const showLoading = (title = '加载中...') => {
  loadingCount += 1
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 统一格式化为北京时间（UTC+8）
 * @param {Date|String|Number} value 时间值
 * @param {String} format 格式化字符串
 * @returns {String} 格式化后的北京时间
 */
const formatBeijingTime = (value, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  let sourceDate = null

  if (value instanceof Date) {
    sourceDate = value
  } else if (typeof value === 'number') {
    sourceDate = new Date(value)
  } else if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      sourceDate = new Date(parsed)
    }
  }

  if (!sourceDate || Number.isNaN(sourceDate.getTime())) {
    return String(value)
  }

  // 使用 UTC 时间加 8 小时后再按 UTC 字段读取，保证无论设备时区都按北京时间展示
  const beijingDate = new Date(sourceDate.getTime() + (8 * 60 * 60 * 1000))
  const year = beijingDate.getUTCFullYear()
  const month = beijingDate.getUTCMonth() + 1
  const day = beijingDate.getUTCDate()
  const hour = beijingDate.getUTCHours()
  const minute = beijingDate.getUTCMinutes()
  const second = beijingDate.getUTCSeconds()

  return format
    .replace('YYYY', year)
    .replace('MM', padZero(month))
    .replace('DD', padZero(day))
    .replace('HH', padZero(hour))
    .replace('mm', padZero(minute))
    .replace('ss', padZero(second))
}

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  if (loadingCount <= 0) {
    return
  }

  loadingCount -= 1
  wx.hideLoading()
}

/**
 * 显示确认对话框
 * @param {String} content 内容
 * @param {String} title 标题
 * @returns {Promise}
 */
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        if (res.confirm) {
          resolve()
        } else {
          reject()
        }
      }
    })
  })
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {Number} wait 等待时间
 * @returns {Function}
 */
const debounce = (func, wait = 500) => {
  let timeout
  return function() {
    const context = this
    const args = arguments
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {Number} wait 等待时间
 * @returns {Function}
 */
const throttle = (func, wait = 500) => {
  let previous = 0
  return function() {
    const now = Date.now()
    const context = this
    const args = arguments
    if (now - previous > wait) {
      func.apply(context, args)
      previous = now
    }
  }
}

/**
 * 验证手机号
 * @param {String} phone 手机号
 * @returns {Boolean}
 */
const validatePhone = (phone) => {
  return /^1\d{10}$/.test(phone)
}

/**
 * 深拷贝
 * @param {*} obj 要拷贝的对象
 * @returns {*}
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 获取本地存储
 * @param {String} key 键名
 * @returns {*}
 */
const getStorage = (key) => {
  try {
    return wx.getStorageSync(key)
  } catch (e) {
    return null
  }
}

/**
 * 设置本地存储
 * @param {String} key 键名
 * @param {*} value 值
 */
const setStorage = (key, value) => {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.error('存储失败', e)
  }
}

/**
 * 移除本地存储
 * @param {String} key 键名
 */
const removeStorage = (key) => {
  try {
    wx.removeStorageSync(key)
  } catch (e) {
    console.error('移除失败', e)
  }
}

/**
 * 计算会员价格
 * @param {Number} price 原价（分）
 * @param {Number} memberLevel 会员等级 0-普通 1-银卡 2-金卡
 * @returns {Number} 会员价格（分）
 */
const calculateMemberPrice = (price, memberLevel) => {
  if (!memberLevel || memberLevel === 0) {
    return price
  }
  
  // 银卡会员 9.5折
  if (memberLevel === 1) {
    return Math.floor(price * 0.95)
  }
  
  // 金卡会员 9折
  if (memberLevel === 2) {
    return Math.floor(price * 0.9)
  }
  
  return price
}

/**
 * 获取会员折扣率
 * @param {Number} memberLevel 会员等级
 * @returns {Number} 折扣率（如95表示9.5折）
 */
const getMemberDiscount = (memberLevel) => {
  if (memberLevel === 1) return 95
  if (memberLevel === 2) return 90
  return 100
}

/**
 * 检查商品库存状态
 * @param {Object} product 商品对象
 * @param {String} skuCode SKU编码（可选）
 * @returns {Object} 库存状态 { inStock: Boolean, stock: Number, status: String }
 */
const checkStockStatus = (product, skuCode = null) => {
  let stock = 0
  
  // 如果指定了SKU，检查SKU库存
  if (skuCode && product.skus && product.skus.length > 0) {
    const sku = product.skus.find(s => s.skuCode === skuCode)
    if (sku) {
      stock = sku.stock || 0
    }
  } else if (product.skus && product.skus.length > 0) {
    // 如果没有指定SKU，计算所有SKU的总库存
    stock = product.skus.reduce((sum, sku) => sum + (sku.stock || 0), 0)
  } else {
    // 如果商品没有SKU，使用商品的stock字段
    stock = product.stock || 0
  }
  
  return {
    inStock: stock > 0,
    stock: stock,
    status: stock === 0 ? 'out_of_stock' : (stock <= 10 ? 'low_stock' : 'in_stock')
  }
}

/**
 * 获取库存状态文本
 * @param {String} status 库存状态
 * @returns {String} 状态文本
 */
const getStockStatusText = (status) => {
  const statusMap = {
    'out_of_stock': '缺货',
    'low_stock': '库存紧张',
    'in_stock': '有货'
  }
  return statusMap[status] || '未知'
}

/**
 * 检查是否需要库存预警
 * @param {Number} stock 库存数量
 * @param {Number} threshold 预警阈值，默认10
 * @returns {Boolean}
 */
const needStockWarning = (stock, threshold = 10) => {
  return stock > 0 && stock <= threshold
}

module.exports = {
  formatTime,
  formatBeijingTime,
  formatPrice,
  normalizeSpecText,
  yuanToFen,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  debounce,
  throttle,
  validatePhone,
  deepClone,
  getStorage,
  setStorage,
  removeStorage,
  calculateMemberPrice,
  getMemberDiscount,
  checkStockStatus,
  getStockStatusText,
  needStockWarning
}
