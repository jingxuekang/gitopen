// 云函数：获取收藏列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function normalizeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildDefaultSpecValues(product = {}) {
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

function withSkuFallback(product = {}) {
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
      specValues: buildDefaultSpecValues(product),
      price: basePrice,
      stock: baseStock
    }]

  return {
    ...product,
    skus
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取用户收藏列表
    const favoritesResult = await db.collection('favorites')
      .where({ userId: OPENID })
      .orderBy('createdAt', 'desc')
      .get()

    if (favoritesResult.data.length === 0) {
      return {
        code: 0,
        message: '获取成功',
        data: []
      }
    }

    // 获取商品详情
    const productIds = favoritesResult.data.map(item => item.productId)
    const productsResult = await db.collection('products')
      .where({
        _id: db.command.in(productIds)
      })
      .get()

    // 合并收藏和商品信息
    const favorites = favoritesResult.data.map(favorite => {
      const product = productsResult.data.find(p => p._id === favorite.productId)
      return {
        ...favorite,
        product: product ? withSkuFallback(product) : product
      }
    })

    return {
      code: 0,
      message: '获取成功',
      data: favorites
    }
  } catch (err) {
    console.error('获取收藏列表失败', err)
    const message = (err && (err.message || err.errMsg)) || ''
    const collectionMissing = message.includes('DATABASE_COLLECTION_NOT_EXIST') || message.includes('collection not exists')

    // 收藏集合未创建时，返回空列表兜底，避免前端收藏状态检查报错
    if (collectionMissing) {
      return {
        code: 0,
        message: '收藏集合未创建，返回空列表',
        data: []
      }
    }

    return {
      code: -1,
      message: '获取收藏列表失败',
      error: err.message
    }
  }
}
