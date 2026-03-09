// 云函数：添加商品到购物车
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

function getProductSkus(product = {}) {
  const basePrice = normalizeNumber(product.price, 0)
  const baseStock = normalizeNumber(product.stock, 0)
  const defaultSkuCode = `DEFAULT_${product._id || 'SKU'}`
  const sourceSkus = Array.isArray(product.skus) ? product.skus : []

  if (sourceSkus.length > 0) {
    return sourceSkus.map((sku, index) => ({
      ...sku,
      skuCode: sku && sku.skuCode ? sku.skuCode : `${defaultSkuCode}_${index}`,
      specValues: Array.isArray(sku && sku.specValues) && sku.specValues.length > 0
        ? sku.specValues
        : ['默认规格:标准'],
      price: normalizeNumber(sku && sku.price, basePrice),
      stock: normalizeNumber(sku && sku.stock, baseStock)
    }))
  }

  return [{
    skuCode: defaultSkuCode,
    specValues: buildDefaultSpecValues(product),
    price: basePrice,
    stock: baseStock
  }]
}

exports.main = async (event, context) => {
  const { productId, skuCode, quantity = 1 } = event
  const { OPENID } = cloud.getWXContext()
  const safeQuantity = Math.max(1, Math.floor(normalizeNumber(quantity, 1)))

  try {
    // 参数验证
    if (!productId || !skuCode) {
      return {
        code: 400,
        message: '商品ID和SKU不能为空'
      }
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return {
        code: 400,
        message: '数量必须大于0'
      }
    }

    // 检查商品是否存在
    const productResult = await db.collection('products')
      .doc(productId)
      .get()

    if (!productResult.data) {
      return {
        code: 404,
        message: '商品不存在'
      }
    }

    const product = productResult.data

    const skus = getProductSkus(product)

    // 检查SKU是否存在
    const sku = skus.find(s => s.skuCode === skuCode)
    if (!sku) {
      return {
        code: 404,
        message: 'SKU不存在'
      }
    }

    // 检查库存
    if (sku.stock < safeQuantity) {
      return {
        code: 409,
        message: '库存不足'
      }
    }

    // 查询购物车中是否已存在该商品
    const existResult = await db.collection('cart_items')
      .where({
        userId: OPENID,
        productId,
        skuCode
      })
      .get()

    if (existResult.data.length > 0) {
      // 已存在，累加数量
      const cartItem = existResult.data[0]
      const newQuantity = normalizeNumber(cartItem.quantity, 0) + safeQuantity

      // 检查累加后的数量是否超过库存
      if (newQuantity > sku.stock) {
        return {
          code: 409,
          message: '库存不足'
        }
      }

      await db.collection('cart_items')
        .doc(cartItem._id)
        .update({
          data: {
            quantity: newQuantity,
            updatedAt: new Date()
          }
        })

      return {
        code: 0,
        message: '已更新购物车商品数量',
        data: {
          cartItemId: cartItem._id,
          quantity: newQuantity
        }
      }
    } else {
      // 不存在，添加新记录
      const addResult = await db.collection('cart_items').add({
        data: {
          userId: OPENID,
          productId,
          skuCode,
          quantity: safeQuantity,
          selected: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      return {
        code: 0,
        message: '添加到购物车成功',
        data: {
          cartItemId: addResult._id,
          quantity: safeQuantity
        }
      }
    }
  } catch (err) {
    console.error('添加到购物车失败', err)
    return {
      code: -1,
      message: '添加到购物车失败',
      error: err.message
    }
  }
}
