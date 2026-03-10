// pages/group/detail/detail.js
const { formatPrice } = require('../../../../utils/util.js')

Page({
  data: {
    activityId: '',
    groupId: '',
    activity: null,
    product: null,
    group: null,
    loading: true,
    isLeader: false,
    canJoin: false,
    timeLeft: '',
    timer: null
  },

  onLoad(options) {
    const { activityId, groupId } = options
    
    if (groupId) {
      // 查看已有拼团
      this.setData({ groupId })
      this.loadGroupDetail()
    } else if (activityId) {
      // 查看拼团活动
      this.setData({ activityId })
      this.loadActivityDetail()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onUnload() {
    // 清除定时器
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
  },

  // 加载拼团活动详情
  async loadActivityDetail() {
    try {
      wx.showLoading({ title: '加载中...' })

      const result = await wx.cloud.callFunction({
        name: 'getGroupActivities',
        data: {}
      })

      wx.hideLoading()

      if (result.result.success) {
        const activity = result.result.data.activities.find(
          item => item._id === this.data.activityId
        )

        if (activity) {
          this.setData({
            activity,
            product: activity.productInfo,
            loading: false
          })
        } else {
          wx.showToast({
            title: '活动不存在',
            icon: 'none'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载活动详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载拼团详情
  async loadGroupDetail() {
    try {
      wx.showLoading({ title: '加载中...' })

      const result = await wx.cloud.callFunction({
        name: 'getGroupDetail',
        data: {
          groupId: this.data.groupId
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        const { group, activity, product } = result.result.data
        
        // 获取当前用户ID
        const userInfo = wx.getStorageSync('userInfo')
        const isLeader = group.leaderId === userInfo._id
        const canJoin = group.status === 0 && group.currentCount < group.requiredCount

        this.setData({
          group,
          activity,
          product,
          isLeader,
          canJoin,
          loading: false
        })

        // 如果拼团进行中，启动倒计时
        if (group.status === 0) {
          this.startCountdown()
        }
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载拼团详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 启动倒计时
  startCountdown() {
    const updateTime = () => {
      const now = new Date().getTime()
      const expireTime = new Date(this.data.group.expireAt).getTime()
      const diff = expireTime - now

      if (diff <= 0) {
        this.setData({ timeLeft: '已过期' })
        if (this.data.timer) {
          clearInterval(this.data.timer)
        }
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      this.setData({
        timeLeft: `${hours}小时${minutes}分${seconds}秒`
      })
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    this.setData({ timer })
  },

  // 发起拼团
  async onCreateGroup() {
    try {
      wx.showLoading({ title: '创建中...' })

      const result = await wx.cloud.callFunction({
        name: 'createGroup',
        data: {
          activityId: this.data.activityId
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '拼团创建成功',
          icon: 'success'
        })

        // 跳转到拼团详情页
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/group/detail/detail?groupId=${result.result.data.groupId}`
          })
        }, 1500)
      } else {
        wx.showToast({
          title: result.result.message || '创建失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('创建拼团失败:', error)
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
    }
  },

  // 参与拼团
  async onJoinGroup() {
    try {
      wx.showLoading({ title: '参团中...' })

      const result = await wx.cloud.callFunction({
        name: 'joinGroup',
        data: {
          groupId: this.data.groupId
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '参团成功',
          icon: 'success'
        })

        // 刷新页面
        setTimeout(() => {
          this.loadGroupDetail()
        }, 1500)
      } else {
        wx.showToast({
          title: result.result.message || '参团失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('参团失败:', error)
      wx.showToast({
        title: '参团失败',
        icon: 'none'
      })
    }
  },

  // 分享拼团
  onShareGroup() {
    // 微信小程序分享功能
  },

  // 查看商品详情
  onViewProduct() {
    const productId = this.data.product._id
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    })
  },

  // 图片预览
  onPreviewImage(e) {
    const { current } = e.currentTarget.dataset
    wx.previewImage({
      current,
      urls: this.data.product.images
    })
  },

  // 分享配置
  onShareAppMessage() {
    if (this.data.groupId) {
      return {
        title: `邀请你参加${this.data.product.name}的拼团`,
        path: `/pages/group/detail/detail?groupId=${this.data.groupId}`,
        imageUrl: this.data.product.images[0]
      }
    } else {
      return {
        title: `${this.data.product.name} 拼团优惠`,
        path: `/pages/group/detail/detail?activityId=${this.data.activityId}`,
        imageUrl: this.data.product.images[0]
      }
    }
  },

  // 格式化价格
  formatPrice(price) {
    return formatPrice(price)
  }
})

