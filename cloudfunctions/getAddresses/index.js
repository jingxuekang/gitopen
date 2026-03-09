// 云函数：获取用户收货地址列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 查询用户的所有地址，按创建时间倒序
    const result = await db.collection('addresses')
      .where({
        userId: userId
      })
      .orderBy('createdAt', 'desc')
      .get()

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('获取地址列表失败:', error)
    return {
      success: false,
      message: '获取地址列表失败',
      error: error.message
    }
  }
}
