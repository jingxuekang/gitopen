// 订单确认页面
const app = getApp()
const { calculateMemberPrice } = require('../../utils/util.js')

Page({
  data: {
    // 收货地址
    address: null,
    hasAddress: false,
    
    // 商品列表
    items: [],
    
    // 价格信息
    totalAmount: 0,      // 商品总价
    memberDiscount: 0,   // 会员折扣
    discountAmount: 0,   // 优惠券优惠金额
    payAmount: 0,        // 实付金额
    
    // 优惠券
    selectedCoupon: null,
    
    // 订单备注
    remark: '',
    
    // 来源类型：cart-购物车结算，buy-立即购买
    sourceType: 'cart',
    
    // 用户会员等级
    memberLevel: 0,
    
    // 加载状态
    loading: true
  },

  onLoad(options) {
    // 获取来源类型和商品信息
    const sourceType = options.sourceType || 'cart'
    this.setData({ sourceType })

    if (sourceType === 'cart') {
      // 从购物车结算
      const items = wx.getStorageSync('orderItems') || []
      if (items.length === 0) {
        wx.showToast({
          title: '请选择商品',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }
      this.setData({ items })
    } else if (sourceType === 'buy') {
      // 立即购买
      const item = wx.getStorageSync('buyNowItem')
      if (!item) {
        wx.showToast({
          title: '商品信息错误',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }
      this.setData({ items: [item] })
    }

    // 加载数据
    this.loadUserProfile()
    this.loadDefaultAddress()
  },

  onShow() {
    // 从地址管理页面返回时，重新加载地址
    if (this.data.hasAddress) {
      this.loadDefaultAddress()
    }
    // 重新加载用户信息（可能会员等级有变化）
    this.loadUserProfile()
  },

  // 加载用户资料
  async loadUserProfile() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getUserProfile'
      })
      
      if (result.result.success) {
        this.setData({
          memberLevel: result.result.data.memberLevel || 0
        })
        // 加载完用户信息后计算价格
        this.calculatePrice()
      }
    } catch (err) {
      // 静默失败
      console.error('加载用户信息失败', err)
      this.calculatePrice()
    }
  },

  // 加载默认收货地址
  async loadDefaultAddress() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getAddresses'
      })

      if (result.result.success) {
        const addresses = result.result.data
        // 查找默认地址
        const defaultAddress = addresses.find(addr => addr.isDefault)
        const address = defaultAddress || addresses[0] || null

        this.setData({
          address,
          hasAddress: !!address,
          loading: false
        })
      } else {
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载地址失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载地址失败',
        icon: 'none'
      })
    }
  },

  // 计算价格
  calculatePrice() {
    const items = this.data.items
    const selectedCoupon = this.data.selectedCoupon
    const memberLevel = this.data.memberLevel

    // 格式化商品列表中的价格
    const formattedItems = items.map(item => ({
      ...item,
      formattedPrice: (item.price / 100).toFixed(2)
    }))

    // 计算商品总价（原价）
    const totalAmount = items.reduce((sum, item) => {
      return sum + item.price * item.quantity
    }, 0)

    // 计算会员折扣后的价格
    let memberDiscountedAmount = totalAmount
    let memberDiscount = 0
    
    if (memberLevel > 0) {
      memberDiscountedAmount = items.reduce((sum, item) => {
        const memberPrice = calculateMemberPrice(item.price, memberLevel)
        return sum + memberPrice * item.quantity
      }, 0)
      memberDiscount = totalAmount - memberDiscountedAmount
    }

    // 计算优惠券优惠金额（基于会员折扣后的价格）
    let couponDiscount = 0
    if (selectedCoupon) {
      if (selectedCoupon.type === 1) {
        // 满减券
        if (memberDiscountedAmount >= selectedCoupon.minAmount) {
          couponDiscount = selectedCoupon.value
        }
      } else if (selectedCoupon.type === 2) {
        // 折扣券
        couponDiscount = Math.floor(memberDiscountedAmount * (100 - selectedCoupon.value) / 100)
      }
    }

    // 计算实付金额
    const payAmount = Math.max(memberDiscountedAmount - couponDiscount, 0)

    this.setData({
      items: formattedItems,
      totalAmount,
      memberDiscount,
      discountAmount: couponDiscount,
      payAmount,
      // 格式化的价格字符串
      formattedTotalAmount: (totalAmount / 100).toFixed(2),
      formattedMemberDiscount: (memberDiscount / 100).toFixed(2),
      formattedDiscountAmount: (couponDiscount / 100).toFixed(2),
      formattedPayAmount: (payAmount / 100).toFixed(2)
    })
  },

  // 选择收货地址
  onSelectAddress() {
    if (this.data.hasAddress) {
      // 已有地址，跳转到地址列表选择
      wx.navigateTo({
        url: '/pages/user/address/list/list?mode=select'
      })
    } else {
      // 没有地址，跳转到添加地址
      wx.navigateTo({
        url: '/pages/user/address/edit/edit'
      })
    }
  },

  // 选择优惠券
  onSelectCoupon() {
    // 跳转到优惠券选择页面
    wx.navigateTo({
      url: `/pages/coupon/select/select?totalAmount=${this.data.totalAmount}&selectedCouponId=${this.data.selectedCoupon ? this.data.selectedCoupon._id : ''}`
    })
  },

  // 优惠券选择回调
  onCouponSelected(coupon) {
    this.setData({
      selectedCoupon: coupon ? coupon.couponInfo : null
    })
    this.calculatePrice()
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  // 提交订单
  async onSubmit() {
    // 验证收货地址
    if (!this.data.address) {
      wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      })
      return
    }

    // 显示加载提示
    wx.showLoading({
      title: '提交中...',
      mask: true
    })

    try {
      // 准备订单数据
      const orderData = {
        items: this.data.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          skuCode: item.skuCode,
          specText: item.specText,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        address: {
          name: this.data.address.name,
          phone: this.data.address.phone,
          province: this.data.address.province,
          city: this.data.address.city,
          district: this.data.address.district,
          detail: this.data.address.detail
        },
        totalAmount: this.data.totalAmount,
        memberDiscount: this.data.memberDiscount,
        discountAmount: this.data.discountAmount,
        payAmount: this.data.payAmount,
        couponId: this.data.selectedCoupon ? this.data.selectedCoupon._id : null,
        userCouponId: this.data.selectedCoupon ? this.data.selectedCoupon.userCouponId : null,
        remark: this.data.remark,
        memberLevel: this.data.memberLevel
      }

      // 调用创建订单云函数
      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: orderData
      })

      wx.hideLoading()

      if (result.result.success) {
        const orderId = result.result.data.orderId
        
        // 清除临时数据
        wx.removeStorageSync('orderItems')
        wx.removeStorageSync('buyNowItem')

        // 跳转到支付页面
        wx.redirectTo({
          url: `/pages/payment/payment?orderId=${orderId}`
        })
      } else {
        wx.showToast({
          title: result.result.message || '订单创建失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('提交订单失败:', error)
      wx.showToast({
        title: '提交订单失败',
        icon: 'none'
      })
    }
  }
})
