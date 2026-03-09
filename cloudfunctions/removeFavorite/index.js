// 云函数：取消收藏
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { productId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    if (!productId) {
      return {
        code: 400,
        message: '商品ID不能为空'
      }
    }

    // 查找收藏记录
    const favoriteResult = await db.collection('favorites')
      .where({
        userId: OPENID,
        productId
      })
      .get()

    if (favoriteResult.data.length === 0) {
      return {
        code: 0,
        message: '已是未收藏状态'
      }
    }

    // 删除收藏
    await db.collection('favorites')
      .doc(favoriteResult.data[0]._id)
      .remove()

    return {
      code: 0,
      message: '取消收藏成功'
    }
  } catch (err) {
    console.error('取消收藏失败', err)
    const message = (err && (err.message || err.errMsg)) || ''
    const collectionMissing = message.includes('DATABASE_COLLECTION_NOT_EXIST') || message.includes('collection not exists')

    // 收藏集合未创建时按“已取消”处理，避免前端展示失败
    if (collectionMissing) {
      return {
        code: 0,
        message: '收藏集合未创建，视为已取消'
      }
    }

    return {
      code: -1,
      message: '取消收藏失败',
      error: err.message
    }
  }
}
