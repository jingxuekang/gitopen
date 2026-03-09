// 云函数：更新用户信息
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  console.log('updateUserInfo 云函数开始执行')
  console.log('event:', event)
  
  const wxContext = cloud.getWXContext()
  console.log('wxContext:', wxContext)
  
  const { OPENID } = wxContext
  const { nickname, avatar, phone } = event

  if (!OPENID) {
    console.error('无法获取 OPENID')
    return {
      code: -1,
      message: '无法获取用户信息'
    }
  }

  try {
    // 查找用户
    const userResult = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    if (userResult.data.length === 0) {
      console.error('用户不存在')
      return {
        code: -1,
        message: '用户不存在'
      }
    }

    const userId = userResult.data[0]._id

    // 构建更新数据
    const updateData = {
      updatedAt: db.serverDate()
    }

    if (nickname !== undefined) {
      updateData.nickname = nickname
      console.log('更新昵称:', nickname)
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar
      console.log('更新头像:', avatar)
    }

    if (phone !== undefined) {
      updateData.phone = phone
      console.log('更新手机:', phone)
    }

    // 更新用户信息
    await db.collection('users')
      .doc(userId)
      .update({
        data: updateData
      })

    console.log('更新成功')

    // 获取更新后的用户信息
    const updatedUserResult = await db.collection('users')
      .doc(userId)
      .get()

    return {
      code: 0,
      message: '更新成功',
      data: updatedUserResult.data
    }
  } catch (err) {
    console.error('更新用户信息失败', err)
    return {
      code: -1,
      message: '更新失败: ' + err.message,
      error: err.message,
      stack: err.stack
    }
  }
}
