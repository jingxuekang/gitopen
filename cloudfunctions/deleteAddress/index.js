// 云函数：删除收货地址
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  const { addressId } = event

  try {
    // 验证地址ID
    if (!addressId) {
      return {
        success: false,
        message: '地址ID不能为空'
      }
    }

    // 验证地址是否属于当前用户
    const addressResult = await db.collection('addresses')
      .doc(addressId)
      .get()

    if (!addressResult.data || addressResult.data.userId !== userId) {
      return {
        success: false,
        message: '地址不存在或无权限删除'
      }
    }

    // 删除地址
    await db.collection('addresses')
      .doc(addressId)
      .remove()

    return {
      success: true,
      message: '删除地址成功'
    }
  } catch (error) {
    console.error('删除地址失败:', error)
    return {
      success: false,
      message: '删除地址失败',
      error: error.message
    }
  }
}
