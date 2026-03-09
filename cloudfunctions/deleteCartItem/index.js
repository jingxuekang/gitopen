// 云函数：删除购物车商品
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { cartItemId, cartItemIds } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 批量删除
    if (cartItemIds && Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      // 验证所有商品都属于当前用户
      const cartResult = await db.collection('cart_items')
        .where({
          _id: _.in(cartItemIds),
          userId: OPENID
        })
        .get()

      if (cartResult.data.length !== cartItemIds.length) {
        return {
          code: 403,
          message: '部分商品无权限删除'
        }
      }

      // 批量删除
      const deletePromises = cartItemIds.map(id => 
        db.collection('cart_items').doc(id).remove()
      )

      await Promise.all(deletePromises)

      return {
        code: 0,
        message: '批量删除成功',
        data: {
          deletedCount: cartItemIds.length
        }
      }
    }

    // 单个删除
    if (cartItemId) {
      // 查询购物车商品
      const cartResult = await db.collection('cart_items')
        .doc(cartItemId)
        .get()

      if (!cartResult.data) {
        return {
          code: 404,
          message: '购物车商品不存在'
        }
      }

      // 验证权限
      if (cartResult.data.userId !== OPENID) {
        return {
          code: 403,
          message: '无权限操作'
        }
      }

      // 删除购物车商品
      await db.collection('cart_items')
        .doc(cartItemId)
        .remove()

      return {
        code: 0,
        message: '删除成功'
      }
    }

    return {
      code: 400,
      message: '请提供要删除的商品ID'
    }
  } catch (err) {
    console.error('删除购物车商品失败', err)
    return {
      code: -1,
      message: '删除购物车商品失败',
      error: err.message
    }
  }
}
