// 云函数：获取拼团详情
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { groupId } = event

  if (!groupId) {
    return {
      success: false,
      message: '缺少拼团ID'
    }
  }

  try {
    // 查询拼团记录
    const groupResult = await db.collection('groups').doc(groupId).get()
    
    if (!groupResult.data) {
      return {
        success: false,
        message: '拼团不存在'
      }
    }

    const group = groupResult.data

    // 查询拼团活动
    const activityResult = await db.collection('group_activities').doc(group.activityId).get()
    
    if (!activityResult.data) {
      return {
        success: false,
        message: '拼团活动不存在'
      }
    }

    const activity = activityResult.data

    // 查询商品信息
    const productResult = await db.collection('products').doc(activity.productId).get()

    // 获取成员信息
    const members = await Promise.all(
      group.members.map(async (member) => {
        try {
          const userResult = await db.collection('users').doc(member.userId).get()
          return {
            ...member,
            userInfo: userResult.data ? {
              nickname: userResult.data.nickname,
              avatar: userResult.data.avatar
            } : {
              nickname: '用户',
              avatar: ''
            }
          }
        } catch (error) {
          return {
            ...member,
            userInfo: {
              nickname: '用户',
              avatar: ''
            }
          }
        }
      })
    )

    return {
      success: true,
      data: {
        group: {
          ...group,
          members: members
        },
        activity: activity,
        product: productResult.data || null
      }
    }

  } catch (error) {
    console.error('获取拼团详情失败:', error)
    return {
      success: false,
      message: '获取拼团详情失败',
      error: error.message
    }
  }
}
