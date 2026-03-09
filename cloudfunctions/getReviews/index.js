// 云函数：获取商品评价列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { productId, filter = 'all', page = 1, pageSize = 10 } = event

  if (!productId) {
    return {
      success: false,
      message: '缺少商品ID'
    }
  }

  try {
    // 构建查询条件
    const where = { productId: productId }

    // 根据筛选条件添加评分过滤
    if (filter === 'good') {
      where.rating = db.command.gte(4) // 好评：4-5星
    } else if (filter === 'medium') {
      where.rating = 3 // 中评：3星
    } else if (filter === 'bad') {
      where.rating = db.command.lte(2) // 差评：1-2星
    }

    // 查询评价列表
    const reviewsResult = await db.collection('reviews')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 获取用户信息
    const rawReviews = Array.isArray(reviewsResult.data) ? reviewsResult.data : []
    const userIds = rawReviews.map(item => item.userId).filter(Boolean)

    let userMap = {}
    if (userIds.length > 0) {
      try {
        const usersResult = await db.collection('users')
          .where({
            openid: _.in(userIds)
          })
          .field({
            openid: true,
            nickname: true,
            avatar: true
          })
          .get()

        userMap = (usersResult.data || []).reduce((acc, item) => {
          acc[item.openid] = item
          return acc
        }, {})
      } catch (userErr) {
        console.warn('批量读取评价用户信息失败：', userErr)
      }
    }

    const reviews = rawReviews.map((review) => {
      const mappedUser = userMap[review.userId]
      const snapshotUser = review.userSnapshot || null
      return {
        ...review,
        userInfo: mappedUser ? {
          nickname: mappedUser.nickname || '匿名用户',
          avatar: mappedUser.avatar || ''
        } : snapshotUser ? {
          nickname: snapshotUser.nickname || '匿名用户',
          avatar: snapshotUser.avatar || ''
        } : {
          nickname: '匿名用户',
          avatar: ''
        }
      }
    })

    // 查询总数
    const countResult = await db.collection('reviews')
      .where(where)
      .count()

    return {
      success: true,
      data: {
        reviews: reviews,
        total: countResult.total,
        hasMore: page * pageSize < countResult.total
      }
    }

  } catch (error) {
    console.error('获取评价列表失败:', error)
    return {
      success: false,
      message: '获取评价列表失败',
      error: error.message
    }
  }
}
