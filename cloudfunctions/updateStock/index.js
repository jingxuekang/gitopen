// 云函数：更新商品库存（管理员功能）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const STOCK_WARNING_THRESHOLD = 10

// 管理员白名单（实际应该从数据库读取）
const ADMIN_OPENIDS = [
  'oXXXX-admin-openid-1',  // 替换为实际管理员 openid
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

  const { productId, skuCode, stock, operation = 'set' } = event

  try {
    // 验证必填字段
    if (!productId) {
      return {
        success: false,
        message: '商品ID不能为空'
      }
    }

    // 查询商品信息
    const productResult = await db.collection('products').doc(productId).get()
    
    if (!productResult.data) {
      return {
        success: false,
        message: '商品不存在'
      }
    }

    const product = productResult.data

    // 如果指定了SKU，更新SKU库存
    if (skuCode) {
      const skuIndex = product.skus.findIndex(s => s.skuCode === skuCode)
      
      if (skuIndex === -1) {
        return {
          success: false,
          message: 'SKU不存在'
        }
      }

      const currentStock = product.skus[skuIndex].stock
      let newStock

      // 根据操作类型计算新库存
      if (operation === 'set') {
        // 直接设置库存
        if (typeof stock !== 'number' || stock < 0) {
          return {
            success: false,
            message: '库存数量必须是非负整数'
          }
        }
        newStock = stock
      } else if (operation === 'increase') {
        // 增加库存
        if (typeof stock !== 'number' || stock <= 0) {
          return {
            success: false,
            message: '增加数量必须是正整数'
          }
        }
        newStock = currentStock + stock
      } else if (operation === 'decrease') {
        // 减少库存
        if (typeof stock !== 'number' || stock <= 0) {
          return {
            success: false,
            message: '减少数量必须是正整数'
          }
        }
        newStock = Math.max(0, currentStock - stock)
      } else {
        return {
          success: false,
          message: '不支持的操作类型'
        }
      }

      // 更新SKU库存
      await db.collection('products').doc(productId).update({
        data: {
          [`skus.${skuIndex}.stock`]: newStock,
          updatedAt: new Date()
        }
      })

      // 检查库存预警
      const warnings = []
      if (newStock === 0) {
        warnings.push({
          type: 'out_of_stock',
          message: `SKU ${skuCode} 已缺货`,
          skuCode,
          stock: newStock
        })
      } else if (newStock <= STOCK_WARNING_THRESHOLD) {
        warnings.push({
          type: 'low_stock',
          message: `SKU ${skuCode} 库存不足，当前库存：${newStock}`,
          skuCode,
          stock: newStock
        })
      }

      return {
        success: true,
        data: {
          productId,
          skuCode,
          oldStock: currentStock,
          newStock,
          warnings
        },
        message: '库存更新成功'
      }

    } else {
      // 如果没有指定SKU，更新商品总库存（所有SKU）
      if (operation !== 'set') {
        return {
          success: false,
          message: '批量更新只支持set操作'
        }
      }

      if (typeof stock !== 'number' || stock < 0) {
        return {
          success: false,
          message: '库存数量必须是非负整数'
        }
      }

      // 如果商品有SKU，需要分配库存到各个SKU
      if (product.skus && product.skus.length > 0) {
        // 平均分配库存到各个SKU
        const stockPerSku = Math.floor(stock / product.skus.length)
        const remainder = stock % product.skus.length
        
        const updateData = {}
        const warnings = []
        
        product.skus.forEach((sku, index) => {
          const skuStock = stockPerSku + (index < remainder ? 1 : 0)
          updateData[`skus.${index}.stock`] = skuStock
          
          // 检查库存预警
          if (skuStock === 0) {
            warnings.push({
              type: 'out_of_stock',
              message: `SKU ${sku.skuCode} 已缺货`,
              skuCode: sku.skuCode,
              stock: skuStock
            })
          } else if (skuStock <= STOCK_WARNING_THRESHOLD) {
            warnings.push({
              type: 'low_stock',
              message: `SKU ${sku.skuCode} 库存不足，当前库存：${skuStock}`,
              skuCode: sku.skuCode,
              stock: skuStock
            })
          }
        })

        updateData.updatedAt = new Date()

        await db.collection('products').doc(productId).update({
          data: updateData
        })

        return {
          success: true,
          data: {
            productId,
            totalStock: stock,
            skuCount: product.skus.length,
            warnings
          },
          message: '库存更新成功'
        }
      } else {
        // 如果商品没有SKU，更新商品的stock字段
        await db.collection('products').doc(productId).update({
          data: {
            stock: stock,
            updatedAt: new Date()
          }
        })

        const warnings = []
        if (stock === 0) {
          warnings.push({
            type: 'out_of_stock',
            message: '商品已缺货',
            stock: stock
          })
        } else if (stock <= STOCK_WARNING_THRESHOLD) {
          warnings.push({
            type: 'low_stock',
            message: `商品库存不足，当前库存：${stock}`,
            stock: stock
          })
        }

        return {
          success: true,
          data: {
            productId,
            stock,
            warnings
          },
          message: '库存更新成功'
        }
      }
    }

  } catch (error) {
    console.error('更新库存失败:', error)
    return {
      success: false,
      message: '更新库存失败',
      error: error.message
    }
  }
}
