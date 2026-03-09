// 云函数：添加收货地址
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 验证手机号格式（必须是11位数字）
function validatePhone(phone) {
  return /^\d{11}$/.test(phone)
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  const { name, phone, province, city, district, detail, isDefault } = event

  try {
    // 验证必填字段
    if (!name || !phone || !province || !city || !district || !detail) {
      return {
        success: false,
        message: '请填写完整的地址信息'
      }
    }

    // 验证手机号格式
    if (!validatePhone(phone)) {
      return {
        success: false,
        message: '手机号必须是11位数字'
      }
    }

    // 检查地址数量限制（最多20个）
    const countResult = await db.collection('addresses')
      .where({
        userId: userId
      })
      .count()

    if (countResult.total >= 20) {
      return {
        success: false,
        message: '收货地址数量已达上限（20个）'
      }
    }

    // 如果设置为默认地址，先将其他地址的默认状态取消
    if (isDefault) {
      await db.collection('addresses')
        .where({
          userId: userId,
          isDefault: true
        })
        .update({
          data: {
            isDefault: false
          }
        })
    }

    // 添加新地址
    const result = await db.collection('addresses').add({
      data: {
        userId: userId,
        name: name,
        phone: phone,
        province: province,
        city: city,
        district: district,
        detail: detail,
        isDefault: isDefault || false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      success: true,
      data: {
        _id: result._id
      },
      message: '添加地址成功'
    }
  } catch (error) {
    console.error('添加地址失败:', error)
    return {
      success: false,
      message: '添加地址失败',
      error: error.message
    }
  }
}
