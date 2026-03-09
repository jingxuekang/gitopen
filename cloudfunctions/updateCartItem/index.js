// 云函数：更新购物车商品数量
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
  const { cartItemId, quantity, selected } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 参数验证
    if (!cartItemId) {
      return {
        code: 400,
        message: '购物车商品ID不能为空'
      }
    }

    // 查询购物车商品
    const cartResult = await db.collection('cart_items')
      .doc(cartItemId)
      .get()

    if (!cartResult.data) {
      return {
        code: 404,
        message: '购物车商品不存在'
      }
    }

    const cartItem = cartResult.data

    // 验证权限
    if (cartItem.userId !== OPENID) {
      return {
        code: 403,
        message: '无权限操作'
      }
    }

    // 构建更新数据
    const updateData = {
      updatedAt: new Date()
    }

    // 如果更新数量
    if (quantity !== undefined) {
      const safeQuantity = Math.floor(normalizeNumber(quantity, 0))
      if (safeQuantity <= 0) {
        return {
          code: 400,
          message: '数量必须大于0'
        }
      }

      // 查询商品信息验证库存
      const productResult = await db.collection('products')
        .doc(cartItem.productId)
        .get()

      if (!productResult.data) {
        return {
          code: 404,
          message: '商品不存在'
        }
      }

      const product = productResult.data
      const skus = getProductSkus(product)
      const sku = skus.find(s => s.skuCode === cartItem.skuCode)

      if (!sku) {
        return {
          code: 404,
          message: 'SKU不存在'
        }
      }

      if (safeQuantity > sku.stock) {
        return {
          code: 409,
          message: '库存不足',
          data: {
            maxStock: sku.stock
          }
        }
      }

      updateData.quantity = safeQuantity
    }

    // 如果更新选中状态
    if (selected !== undefined) {
      updateData.selected = selected
    }

    // 更新购物车商品
    await db.collection('cart_items')
      .doc(cartItemId)
      .update({
        data: updateData
      })

    return {
      code: 0,
      message: '更新成功',
      data: {
        cartItemId,
        ...updateData
      }
    }
  } catch (err) {
    console.error('更新购物车商品失败', err)
    return {
      code: -1,
      message: '更新购物车商品失败',
      error: err.message
    }
  }
}
