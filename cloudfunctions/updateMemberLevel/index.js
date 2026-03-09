// 云函数：检查并更新会员等级
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 会员等级阈值（单位：分）
const MEMBER_THRESHOLDS = {
  0: 0,        // 普通会员：0元
  1: 100000,   // 银卡会员：1000元
  2: 500000    // 金卡会员：5000元
}

// 会员等级名称
const MEMBER_LEVEL_NAMES = ['普通会员', '银卡会员', '金卡会员']

exports.main = async (event, context) => {
  const { userId } = event
  
  if (!userId) {
    return {
      code: 400,
      message: '缺少用户ID'
    }
  }

  try {
    // 查询用户信息
    const userResult = await db.collection('users')
      .where({ openid: userId })
      .get()

    if (userResult.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      }
    }

    const user = userResult.data[0]
    const currentLevel = user.memberLevel || 0
    const totalSpent = user.totalSpent || 0

    // 计算新的会员等级
    let newLevel = 0
    if (totalSpent >= MEMBER_THRESHOLDS[2]) {
      newLevel = 2 // 金卡会员
    } else if (totalSpent >= MEMBER_THRESHOLDS[1]) {
      newLevel = 1 // 银卡会员
    } else {
      newLevel = 0 // 普通会员
    }

    // 如果等级没有变化，直接返回
    if (newLevel === currentLevel) {
      return {
        code: 0,
        message: '会员等级未变化',
        data: {
          upgraded: false,
          currentLevel,
          levelName: MEMBER_LEVEL_NAMES[currentLevel],
          totalSpent
        }
      }
    }

    // 更新会员等级
    await db.collection('users').doc(user._id).update({
      data: {
        memberLevel: newLevel,
        updatedAt: new Date()
      }
    })

    console.log(`用户 ${userId} 会员等级从 ${currentLevel} 升级到 ${newLevel}`)

    // 发送会员升级通知
    if (newLevel > currentLevel) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: userId,
          page: 'pages/user/user',
          data: {
            thing1: { value: '会员等级升级' },
            thing2: { value: MEMBER_LEVEL_NAMES[newLevel] },
            date3: { value: new Date().toLocaleString('zh-CN') }
          },
          templateId: 'YOUR_MEMBER_UPGRADE_TEMPLATE_ID', // 需要在微信公众平台配置
          miniprogramState: 'formal'
        })
      } catch (msgError) {
        console.error('发送会员升级通知失败:', msgError)
        // 通知发送失败不影响升级流程
      }
    }

    return {
      code: 0,
      message: '会员等级更新成功',
      data: {
        upgraded: true,
        oldLevel: currentLevel,
        newLevel,
        oldLevelName: MEMBER_LEVEL_NAMES[currentLevel],
        newLevelName: MEMBER_LEVEL_NAMES[newLevel],
        totalSpent
      }
    }

  } catch (error) {
    console.error('更新会员等级失败:', error)
    return {
      code: -1,
      message: '更新会员等级失败',
      error: error.message
    }
  }
}
