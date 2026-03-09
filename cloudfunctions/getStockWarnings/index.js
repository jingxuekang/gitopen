// 云函数：获取库存预警列表（管理员功能）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const STOCK_WARNING_THRESHOLD = 10

// 管理员白名单
const ADMIN_OPENIDS = [
  'oXXXX-admin-openid-1',
  'oXXXX-admin-openid-2'
]

function requireAdmin(wxContext) {
  if (!wxContext || !wxContext.OPENID) {
    return { ok: false, body: { code: 401, message: '未授权' } }
  }
  if (!ADMIN_OPENIDS.includes(wxContext.OPENID)) {
    return { ok: false, body: { code: 403, message: '无权限' } }
  }
  return { ok: true }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const adminCheck = requireAdmin(wxContext)
  if (!adminCheck.ok) {
    return adminCheck.body
  }

  const { warningType = 'all' } = event // all, out_of_stock, low_stock

  try {
    // 查询所有上架商品
    const productsResult = await db.collection('products')
      .where({
        status: 1 // 上架状态
      })
      .get()

    const warnings = []

    // 检查每个商品的库存状态
    for (const product of productsResult.data) {
      if (product.skus && product.skus.length > 0) {
        // 有SKU的商品，检查每个SKU
        for (const sku of product.skus) {
          const stock = sku.stock || 0
          
          if (stock === 0 && (warningType === 'all' || warningType === 'out_of_stock')) {
            warnings.push({
              productId: product._id,
              productName: product.name,
              productImage: product.images[0],
              skuCode: sku.skuCode,
              specText: sku.specValues.join(' '),
              stock: stock,
              type: 'out_of_stock',
              message: '已缺货',
              priority: 1 // 优先级：1-紧急，2-警告
            })
          } else if (stock > 0 && stock <= STOCK_WARNING_THRESHOLD && (warningType === 'all' || warningType === 'low_stock')) {
            warnings.push({
              productId: product._id,
              productName: product.name,
              productImage: product.images[0],
              skuCode: sku.skuCode,
              specText: sku.specValues.join(' '),
              stock: stock,
              type: 'low_stock',
              message: `库存不足，仅剩${stock}件`,
              priority: 2
            })
          }
        }
      } else {
        // 无SKU的商品，检查总库存
        const stock = product.stock || 0
        
        if (stock === 0 && (warningType === 'all' || warningType === 'out_of_stock')) {
          warnings.push({
            productId: product._id,
            productName: product.name,
            productImage: product.images[0],
            skuCode: null,
            specText: null,
            stock: stock,
            type: 'out_of_stock',
            message: '已缺货',
            priority: 1
          })
        } else if (stock > 0 && stock <= STOCK_WARNING_THRESHOLD && (warningType === 'all' || warningType === 'low_stock')) {
          warnings.push({
            productId: product._id,
            productName: product.name,
            productImage: product.images[0],
            skuCode: null,
            specText: null,
            stock: stock,
            type: 'low_stock',
            message: `库存不足，仅剩${stock}件`,
            priority: 2
          })
        }
      }
    }

    // 按优先级和库存数量排序
    warnings.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.stock - b.stock
    })

    // 统计信息
    const stats = {
      total: warnings.length,
      outOfStock: warnings.filter(w => w.type === 'out_of_stock').length,
      lowStock: warnings.filter(w => w.type === 'low_stock').length
    }

    return {
      success: true,
      data: {
        warnings,
        stats
      },
      message: '获取库存预警成功'
    }

  } catch (error) {
    console.error('获取库存预警失败:', error)
    return {
      success: false,
      message: '获取库存预警失败',
      error: error.message
    }
  }
}
