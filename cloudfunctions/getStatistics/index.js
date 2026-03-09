// 云函数：获取运营数据统计
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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

  const { type, startDate, endDate } = event

  try {
    // 根据统计类型返回不同的数据
    switch (type) {
      case 'daily':
        return await getDailyStatistics(startDate, endDate)
      case 'product':
        return await getProductStatistics(startDate, endDate)
      case 'hotProducts':
        return await getHotProducts(startDate, endDate)
      case 'userRegion':
        return await getUserRegionStatistics()
      case 'overview':
        return await getOverviewStatistics(startDate, endDate)
      default:
        return {
          success: false,
          message: '无效的统计类型'
        }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return {
      success: false,
      message: '获取统计数据失败',
      error: error.message
    }
  }
}

// 获取每日统计数据（订单数量、销售额、新增用户）
async function getDailyStatistics(startDate, endDate) {
  try {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0))
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999))

    // 统计订单数量和销售额（已支付的订单）
    const ordersResult = await db.collection('orders')
      .where({
        paymentStatus: 1, // 已支付
        paymentTime: _.gte(start).and(_.lte(end))
      })
      .get()

    const orders = ordersResult.data
    const orderCount = orders.length
    const totalSales = orders.reduce((sum, order) => sum + order.payAmount, 0)

    // 统计新增用户数
    const usersResult = await db.collection('users')
      .where({
        createdAt: _.gte(start).and(_.lte(end))
      })
      .count()

    const newUserCount = usersResult.total

    return {
      success: true,
      data: {
        orderCount,
        totalSales,
        newUserCount,
        startDate: start,
        endDate: end
      }
    }
  } catch (error) {
    throw error
  }
}

// 获取商品统计数据（浏览量、加购量、销售量）
async function getProductStatistics(startDate, endDate) {
  try {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate) : new Date()

    // 获取所有商品
    const productsResult = await db.collection('products')
      .where({
        status: 1
      })
      .get()

    const products = productsResult.data

    // 统计每个商品的数据
    const productStats = await Promise.all(products.map(async (product) => {
      // 浏览量（从商品浏览记录表统计，如果没有该表则返回0）
      let viewCount = 0
      try {
        const viewResult = await db.collection('product_views')
          .where({
            productId: product._id,
            createdAt: _.gte(start).and(_.lte(end))
          })
          .count()
        viewCount = viewResult.total
      } catch (e) {
        // 如果表不存在，忽略错误
        viewCount = 0
      }

      // 加购量（从购物车记录统计）
      let addToCartCount = 0
      try {
        const cartResult = await db.collection('cart_items')
          .where({
            productId: product._id,
            createdAt: _.gte(start).and(_.lte(end))
          })
          .count()
        addToCartCount = cartResult.total
      } catch (e) {
        addToCartCount = 0
      }

      // 销售量（从已支付订单统计）
      const ordersResult = await db.collection('orders')
        .where({
          paymentStatus: 1,
          paymentTime: _.gte(start).and(_.lte(end))
        })
        .get()

      let salesCount = 0
      ordersResult.data.forEach(order => {
        order.items.forEach(item => {
          if (item.productId === product._id) {
            salesCount += item.quantity
          }
        })
      })

      return {
        productId: product._id,
        productName: product.name,
        productImage: product.images[0],
        viewCount,
        addToCartCount,
        salesCount,
        currentStock: product.skus.reduce((sum, sku) => sum + sku.stock, 0),
        totalSales: product.sales || 0
      }
    }))

    return {
      success: true,
      data: {
        products: productStats,
        startDate: start,
        endDate: end
      }
    }
  } catch (error) {
    throw error
  }
}

// 获取热销商品排行榜
async function getHotProducts(startDate, endDate) {
  try {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate) : new Date()

    // 获取时间范围内的已支付订单
    const ordersResult = await db.collection('orders')
      .where({
        paymentStatus: 1,
        paymentTime: _.gte(start).and(_.lte(end))
      })
      .get()

    // 统计每个商品的销售数量和销售额
    const productSalesMap = {}

    ordersResult.data.forEach(order => {
      order.items.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            salesCount: 0,
            salesAmount: 0
          }
        }
        productSalesMap[item.productId].salesCount += item.quantity
        productSalesMap[item.productId].salesAmount += item.subtotal
      })
    })

    // 转换为数组并按销售量排序
    const hotProducts = Object.values(productSalesMap)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 20) // 取前20名

    return {
      success: true,
      data: {
        hotProducts,
        startDate: start,
        endDate: end
      }
    }
  } catch (error) {
    throw error
  }
}

// 获取用户地域分布统计
async function getUserRegionStatistics() {
  try {
    // 从订单的收货地址统计用户地域分布
    const ordersResult = await db.collection('orders')
      .where({
        paymentStatus: 1 // 只统计已支付订单
      })
      .get()

    // 统计省份分布
    const provinceMap = {}
    const cityMap = {}

    ordersResult.data.forEach(order => {
      if (order.address && order.address.province) {
        const province = order.address.province
        const city = order.address.city

        // 统计省份
        if (!provinceMap[province]) {
          provinceMap[province] = {
            province,
            orderCount: 0,
            userCount: 0,
            salesAmount: 0,
            users: new Set()
          }
        }
        provinceMap[province].orderCount++
        provinceMap[province].salesAmount += order.payAmount
        provinceMap[province].users.add(order.userId)

        // 统计城市
        const cityKey = `${province}-${city}`
        if (!cityMap[cityKey]) {
          cityMap[cityKey] = {
            province,
            city,
            orderCount: 0,
            userCount: 0,
            salesAmount: 0,
            users: new Set()
          }
        }
        cityMap[cityKey].orderCount++
        cityMap[cityKey].salesAmount += order.payAmount
        cityMap[cityKey].users.add(order.userId)
      }
    })

    // 转换为数组并计算用户数
    const provinceStats = Object.values(provinceMap).map(item => ({
      province: item.province,
      orderCount: item.orderCount,
      userCount: item.users.size,
      salesAmount: item.salesAmount
    })).sort((a, b) => b.orderCount - a.orderCount)

    const cityStats = Object.values(cityMap).map(item => ({
      province: item.province,
      city: item.city,
      orderCount: item.orderCount,
      userCount: item.users.size,
      salesAmount: item.salesAmount
    })).sort((a, b) => b.orderCount - a.orderCount).slice(0, 50) // 取前50个城市

    return {
      success: true,
      data: {
        provinceStats,
        cityStats
      }
    }
  } catch (error) {
    throw error
  }
}

// 获取综合统计数据
async function getOverviewStatistics(startDate, endDate) {
  try {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0))
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999))

    // 并行获取各项统计数据
    const [dailyStats, hotProducts, regionStats] = await Promise.all([
      getDailyStatistics(startDate, endDate),
      getHotProducts(startDate, endDate),
      getUserRegionStatistics()
    ])

    // 获取总体统计
    const totalUsersResult = await db.collection('users').count()
    const totalProductsResult = await db.collection('products').where({ status: 1 }).count()
    const totalOrdersResult = await db.collection('orders').where({ paymentStatus: 1 }).count()

    return {
      success: true,
      data: {
        daily: dailyStats.data,
        hotProducts: hotProducts.data.hotProducts.slice(0, 10), // 只返回前10名
        region: {
          topProvinces: regionStats.data.provinceStats.slice(0, 10),
          topCities: regionStats.data.cityStats.slice(0, 10)
        },
        totals: {
          totalUsers: totalUsersResult.total,
          totalProducts: totalProductsResult.total,
          totalOrders: totalOrdersResult.total
        },
        startDate: start,
        endDate: end
      }
    }
  } catch (error) {
    throw error
  }
}
