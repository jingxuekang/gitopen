// 云函数：获取首页数据
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 获取轮播图（使用商品图片）
    const bannerProducts = await db.collection('products')
      .limit(3)
      .get()
    
    const banners = bannerProducts.data.map((p, i) => ({
      id: i + 1,
      image: p.image || (p.images && p.images[0]) || '',
      link: p._id || ''
    }))

    // 获取热销商品（按销量排序，取前10个）
    const hotProducts = await db.collection('products')
      .orderBy('sales', 'desc')
      .limit(10)
      .get()

    // 获取新品推荐（按创建时间排序，取前10个）
    const newProducts = await db.collection('products')
      .orderBy('createTime', 'desc')
      .limit(10)
      .get()

    // 获取拼团活动（进行中的活动）
    let groupProducts = []
    try {
      const groupActivities = await db.collection('group_activities')
        .where({
          status: 1
        })
        .limit(5)
        .get()

      // 关联拼团活动的商品信息
      if (groupActivities.data.length > 0) {
        const groupActivityIds = groupActivities.data.map(item => item.productId)
        const productsResult = await db.collection('products')
          .where({
            _id: db.command.in(groupActivityIds)
          })
          .get()
        
        groupProducts = groupActivities.data.map(activity => {
          const product = productsResult.data.find(p => p._id === activity.productId)
          return {
            ...activity,
            product
          }
        })
      }
    } catch (groupErr) {
      // 拼团集合可能不存在，静默处理
      console.log('拼团数据加载失败（集合可能不存在）:', groupErr.message)
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        banners,
        hotProducts: hotProducts.data,
        newProducts: newProducts.data,
        groupActivities: groupProducts
      }
    }
  } catch (err) {
    console.error('获取首页数据失败', err)
    return {
      code: -1,
      message: '获取首页数据失败',
      error: err.message
    }
  }
}
