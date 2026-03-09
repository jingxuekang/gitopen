// 云函数：搜索商品
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 转义正则特殊字符，防止 ? * [ ] ( ) 等导致 RegExp 抛错
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

exports.main = async (event, context) => {
  const { keyword } = event

  try {
    const raw = (keyword && String(keyword).trim()) || ''
    if (!raw) {
      return { code: 400, message: '搜索关键词不能为空' }
    }
    if (raw.length > 100) {
      return { code: 400, message: '关键词过长' }
    }

    let reg
    try {
      reg = new RegExp(escapeRegExp(raw), 'i')
    } catch (e) {
      return { code: 0, message: '搜索成功', data: [] }
    }
    
    // 搜索商品名称或描述中包含关键词的商品
    const result = await db.collection('products')
      .where({
        status: 1,
        _: _.or([
          { name: reg },
          { description: reg }
        ])
      })
      .orderBy('sales', 'desc')
      .limit(50)
      .get()

    return {
      code: 0,
      message: '搜索成功',
      data: result.data
    }
  } catch (err) {
    console.error('搜索商品失败', err)
    return {
      code: -1,
      message: '搜索商品失败',
      error: err.message
    }
  }
}
