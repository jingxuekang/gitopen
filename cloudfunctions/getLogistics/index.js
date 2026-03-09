// 云函数：查询物流信息
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 快递100 API配置（需要注册获取key）
const KUAIDI100_KEY = 'YOUR_KUAIDI100_KEY'
const KUAIDI100_CUSTOMER = 'YOUR_KUAIDI100_CUSTOMER'

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { orderId } = event

  if (!orderId) {
    return {
      success: false,
      message: '缺少订单ID'
    }
  }

  try {
    const orderResult = await db.collection('orders').doc(orderId).get()
    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    // 校验订单归属：仅订单本人可查物流
    if (order.userId !== openid) {
      return {
        success: false,
        message: '无权限查看该订单物流'
      }
    }

    if (!order.logistics || !order.logistics.trackingNo) {
      return {
        success: false,
        message: '订单暂无物流信息'
      }
    }

    // 调用快递100 API查询物流轨迹
    try {
      const param = JSON.stringify({
        com: getExpressCode(order.logistics.company),
        num: order.logistics.trackingNo
      })

      const sign = generateSign(param)

      const response = await axios.post('https://poll.kuaidi100.com/poll/query.do', null, {
        params: {
          customer: KUAIDI100_CUSTOMER,
          sign: sign,
          param: param
        }
      })

      if (response.data.result) {
        return {
          success: true,
          data: {
            company: order.logistics.company,
            trackingNo: order.logistics.trackingNo,
            traces: response.data.data || [],
            state: response.data.state // 0在途，1揽收，2疑难，3签收，4退签，5派件，6退回，7转投
          }
        }
      } else {
        // API查询失败，返回基本信息
        return {
          success: true,
          data: {
            company: order.logistics.company,
            trackingNo: order.logistics.trackingNo,
            traces: [],
            state: -1
          }
        }
      }

    } catch (apiError) {
      console.error('查询物流API失败:', apiError)
      
      // API失败时返回基本物流信息
      return {
        success: true,
        data: {
          company: order.logistics.company,
          trackingNo: order.logistics.trackingNo,
          traces: [],
          state: -1,
          message: '物流信息查询失败，请稍后重试'
        }
      }
    }

  } catch (error) {
    console.error('查询物流信息失败:', error)
    return {
      success: false,
      message: '查询物流信息失败',
      error: error.message
    }
  }
}

// 将物流公司名称转换为快递100编码
function getExpressCode(companyName) {
  const codeMap = {
    '顺丰速运': 'shunfeng',
    '圆通速递': 'yuantong',
    '中通快递': 'zhongtong',
    '申通快递': 'shentong',
    '韵达快递': 'yunda',
    '百世快递': 'huitongkuaidi',
    '天天快递': 'tiantian',
    '邮政快递': 'youzhengguonei',
    'EMS': 'ems',
    '京东快递': 'jd',
    '德邦快递': 'debangkuaidi'
  }
  
  return codeMap[companyName] || 'auto'
}

// 生成签名
function generateSign(param) {
  const crypto = require('crypto')
  const signStr = param + KUAIDI100_KEY + KUAIDI100_CUSTOMER
  return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase()
}
