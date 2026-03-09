// 云函数：获取商品详情
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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
  const { productId } = event

  try {
    if (!productId) {
      return {
        code: 400,
        message: '商品ID不能为空'
      }
    }

    // 获取商品详情
    const productResult = await db.collection('products')
      .doc(productId)
      .get()

    if (!productResult.data) {
      return {
        code: 404,
        message: '商品不存在'
      }
    }

    const product = withSkuFallback(productResult.data)

    // 获取商品评价（最新5条）。评价相关集合缺失/权限异常时不阻断详情页。
    let reviews = []
    try {
      const reviewsResult = await db.collection('reviews')
        .where({ productId })
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()

      const reviewList = Array.isArray(reviewsResult.data) ? reviewsResult.data : []
      const userIds = reviewList
        .map(review => review.userId)
        .filter(Boolean)

      let users = []
      if (userIds.length > 0) {
        try {
          const usersResult = await db.collection('users')
            .where({
              openid: _.in(userIds)
            })
            .field({ openid: true, nickname: true, avatar: true })
            .get()
          users = Array.isArray(usersResult.data) ? usersResult.data : []
        } catch (userErr) {
          console.warn('读取评价用户信息失败，忽略用户信息', userErr)
        }
      }

      reviews = reviewList.map(review => {
        const user = users.find(u => u.openid === review.userId)
        return {
          ...review,
          user: user || review.userSnapshot || null
        }
      })
    } catch (reviewErr) {
      console.warn('读取商品评价失败，返回空评价', reviewErr)
      reviews = []
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        product,
        reviews
      }
    }
  } catch (err) {
    console.error('获取商品详情失败', err)
    return {
      code: -1,
      message: '获取商品详情失败',
      error: err.message
    }
  }
}
