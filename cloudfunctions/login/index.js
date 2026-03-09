// 云函数：用户登录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  if (!OPENID) {
    return { code: -1, message: '无法获取用户信息' }
  }

  try {
    // 先确保 users 集合存在，查询不会因集合不存在而崩溃
    let userResult
    try {
      userResult = await db.collection('users')
        .where({ openid: OPENID })
        .get()
    } catch (collErr) {
      // 集合可能不存在，尝试创建第一条记录
      console.log('users 集合查询失败，可能不存在:', collErr.message)
      userResult = { data: [] }
    }

    let userId
    let userInfo
    let isNewUser = false

    if (userResult.data.length === 0) {
      // 新用户，创建用户记录
      const newUser = {
        openid: OPENID,
        nickname: '微信用户',
        avatar: '',
        phone: '',
        memberLevel: 0,
        totalSpent: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }

      try {
        const createResult = await db.collection('users').add({
          data: newUser
        })
        userId = createResult._id
        userInfo = { ...newUser, _id: userId }
        isNewUser = true
      } catch (addErr) {
        console.error('创建用户失败:', addErr)
        return {
          code: -1,
          message: '创建用户失败，请确认数据库中已创建 users 集合'
        }
      }
    } else {
      // 老用户
      const user = userResult.data[0]
      userId = user._id
      userInfo = user

      await db.collection('users').doc(userId).update({
        data: { updatedAt: db.serverDate() }
      }).catch(() => {})
    }

    const token = Buffer.from(`${OPENID}_${Date.now()}`).toString('base64')

    return {
      code: 0,
      message: '登录成功',
      data: {
        userId,
        openid: OPENID,
        token,
        isNewUser,
        userInfo: {
          nickname: userInfo.nickname || '微信用户',
          avatar: userInfo.avatar || '',
          memberLevel: userInfo.memberLevel || 0,
          totalSpent: userInfo.totalSpent || 0
        }
      }
    }
  } catch (err) {
    console.error('登录异常:', err)
    return {
      code: -1,
      message: '登录失败: ' + (err.message || '未知错误')
    }
  }
}