// 云函数：数据库初始化
// 用于创建数据库集合和索引

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 创建集合
    const collections = [
      'users',
      'products',
      'addresses',
      'cart_items',
      'orders',
      'reviews',
      'coupons',
      'user_coupons',
      'group_activities',
      'groups',
      'favorites'
    ]

    const results = []

    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName)
        results.push(`集合 ${collectionName} 创建成功`)
      } catch (err) {
        if (err.errCode === -1) {
          results.push(`集合 ${collectionName} 已存在`)
        } else {
          results.push(`集合 ${collectionName} 创建失败: ${err.message}`)
        }
      }
    }

    // 创建索引
    // users 集合索引
    await db.collection('users').createIndex({
      keys: { openid: 1 },
      unique: true
    }).catch(() => {})

    // products 集合索引
    await db.collection('products').createIndex({
      keys: { category: 1, status: 1 }
    }).catch(() => {})

    await db.collection('products').createIndex({
      keys: { name: 'text', description: 'text' }
    }).catch(() => {})

    // cart_items 集合索引
    await db.collection('cart_items').createIndex({
      keys: { userId: 1 }
    }).catch(() => {})

    // orders 集合索引
    await db.collection('orders').createIndex({
      keys: { userId: 1, status: 1 }
    }).catch(() => {})

    await db.collection('orders').createIndex({
      keys: { orderNo: 1 },
      unique: true
    }).catch(() => {})

    // reviews 集合索引
    await db.collection('reviews').createIndex({
      keys: { productId: 1 }
    }).catch(() => {})

    // addresses 集合索引
    await db.collection('addresses').createIndex({
      keys: { userId: 1 }
    }).catch(() => {})

    // user_coupons 集合索引
    await db.collection('user_coupons').createIndex({
      keys: { userId: 1, status: 1 }
    }).catch(() => {})

    // groups 集合索引
    await db.collection('groups').createIndex({
      keys: { activityId: 1, status: 1 }
    }).catch(() => {})

    // favorites 集合索引
    await db.collection('favorites').createIndex({
      keys: { userId: 1 }
    }).catch(() => {})

    await db.collection('favorites').createIndex({
      keys: { userId: 1, productId: 1 },
      unique: true
    }).catch(() => {})

    results.push('索引创建完成')

    return {
      code: 0,
      message: '数据库初始化成功',
      data: results
    }
  } catch (err) {
    return {
      code: -1,
      message: '数据库初始化失败',
      error: err.message
    }
  }
}
