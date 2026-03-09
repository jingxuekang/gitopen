// 云函数：获取购物车列表
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
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取购物车商品列表
    const cartResult = await db.collection('cart_items')
      .where({ userId: OPENID })
      .orderBy('createdAt', 'desc')
      .get()

    if (cartResult.data.length === 0) {
      return {
        code: 0,
        message: '购物车为空',
        data: {
          items: [],
          totalPrice: 0,
          selectedCount: 0
        }
      }
    }

    // 获取所有商品ID
    const productIds = [...new Set(cartResult.data.map(item => item.productId))]

    // 批量查询商品信息
    const productsResult = await db.collection('products')
      .where({
        _id: db.command.in(productIds)
      })
      .get()

    // 创建商品映射
    const productMap = {}
    productsResult.data.forEach(product => {
      productMap[product._id] = product
    })

    // 组装购物车数据
    const items = cartResult.data.map(cartItem => {
      const product = productMap[cartItem.productId]
      
      if (!product) {
        return {
          ...cartItem,
          productName: '商品已下架',
          productImage: '',
          price: 0,
          stock: 0,
          specText: '',
          available: false
        }
      }

      const skus = getProductSkus(product)

      // 查找对应的SKU
      const sku = skus.find(s => s.skuCode === cartItem.skuCode)
      
      if (!sku) {
        return {
          ...cartItem,
          productName: product.name,
          productImage: product.images[0] || '',
          price: 0,
          stock: 0,
          specText: '规格已失效',
          available: false
        }
      }

      // 生成规格文本
      const specText = sku.specValues.join(' ')

      // 检查库存是否充足
      const available = sku.stock >= cartItem.quantity

      return {
        ...cartItem,
        productName: product.name,
        productImage: product.images[0] || '',
        price: sku.price,
        stock: sku.stock,
        specText,
        available,
        subtotal: sku.price * cartItem.quantity
      }
    })

    // 计算总价（只计算选中且可用的商品）
    const totalPrice = items
      .filter(item => item.selected && item.available)
      .reduce((sum, item) => sum + item.subtotal, 0)

    // 计算选中商品数量
    const selectedCount = items.filter(item => item.selected).length

    return {
      code: 0,
      message: '获取购物车成功',
      data: {
        items,
        totalPrice,
        selectedCount
      }
    }
  } catch (err) {
    console.error('获取购物车失败', err)
    return {
      code: -1,
      message: '获取购物车失败',
      error: err.message
    }
  }
}
