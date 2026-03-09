// 云函数：已登录用户补充/绑定手机号（需先通过 login 获取 openid）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: -1, message: '请先进行微信登录' }
  }

  const { phone } = event || {}
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { code: -1, message: '手机号格式不正确' }
  }

  try {
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在，请先完成微信登录' }
    }

    const user = userResult.data[0]
    await db.collection('users').doc(user._id).update({
      data: {
        phone,
        updatedAt: db.serverDate()
      }
    })

    return {
      code: 0,
      message: '手机号绑定成功',
      data: { userId: user._id }
    }
  } catch (err) {
    console.error('bindPhone 失败:', err)
    return {
      code: -1,
      message: '绑定失败: ' + (err.message || '未知错误')
    }
  }
}
