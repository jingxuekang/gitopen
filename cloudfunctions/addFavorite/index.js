// 云函数：添加收藏
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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

    // 检查商品是否存在
    const productResult = await db.collection('products')
      .doc(productId)
      .get()

    if (!productResult.data) {
      return {
        code: 404,
        message: '商品不存在'
      }
    }

    // 检查是否已收藏
    const existResult = await db.collection('favorites')
      .where({
        userId: OPENID,
        productId
      })
      .get()

    if (existResult.data.length > 0) {
      return {
        code: 409,
        message: '已收藏该商品'
      }
    }

    // 添加收藏
    await db.collection('favorites').add({
      data: {
        userId: OPENID,
        productId,
        createdAt: new Date()
      }
    })

    return {
      code: 0,
      message: '收藏成功'
    }
  } catch (err) {
    console.error('添加收藏失败', err)
    return {
      code: -1,
      message: '添加收藏失败',
      error: err.message
    }
  }
}
