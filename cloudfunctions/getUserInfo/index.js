// 云函数：获取用户信息
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    // 查询用户信息
    const result = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      }
    }

    const user = result.data[0]

    // 移除敏感信息
    delete user.openid
    delete user.unionid

    return {
      code: 0,
      message: '获取成功',
      data: user
    }
  } catch (err) {
    console.error('获取用户信息失败', err)
    return {
      code: -1,
      message: '获取用户信息失败',
      error: err.message
    }
  }
}
