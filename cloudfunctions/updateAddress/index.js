// 云函数：更新收货地址
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

  const { addressId, name, phone, province, city, district, detail, isDefault } = event

  try {
    // 验证地址ID
    if (!addressId) {
      return {
        success: false,
        message: '地址ID不能为空'
      }
    }

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

    // 验证地址是否属于当前用户
    const addressResult = await db.collection('addresses')
      .doc(addressId)
      .get()

    if (!addressResult.data || addressResult.data.userId !== userId) {
      return {
        success: false,
        message: '地址不存在或无权限修改'
      }
    }

    // 如果设置为默认地址，先将其他地址的默认状态取消
    if (isDefault) {
      await db.collection('addresses')
        .where({
          userId: userId,
          isDefault: true,
          _id: db.command.neq(addressId)
        })
        .update({
          data: {
            isDefault: false
          }
        })
    }

    // 更新地址
    await db.collection('addresses')
      .doc(addressId)
      .update({
        data: {
          name: name,
          phone: phone,
          province: province,
          city: city,
          district: district,
          detail: detail,
          isDefault: isDefault || false,
          updatedAt: new Date()
        }
      })

    return {
      success: true,
      message: '更新地址成功'
    }
  } catch (error) {
    console.error('更新地址失败:', error)
    return {
      success: false,
      message: '更新地址失败',
      error: error.message
    }
  }
}
