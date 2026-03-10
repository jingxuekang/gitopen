// 订单确认页面
const app = getApp()
const { calculateMemberPrice, normalizeSpecText } = require('../../../../utils/util.js')

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
    
    // 格式化后的价格文本
    totalAmountText: '0.00',
    memberDiscountText: '0.00',
    discountAmountText: '0.00',
    payAmountText: '0.00',
    
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

  // 格式化价格
  formatPrice(price) {
    return (price / 100).toFixed(2)
  },

  normalizeAmount(value, fallback = 0) {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  },

  normalizeOrderItem(item = {}) {
    const quantity = Math.max(1, Math.floor(this.normalizeAmount(item.quantity, 1)))
    const subtotal = this.normalizeAmount(item.subtotal, 0)
    let price = this.normalizeAmount(item.price, 0)

    if (price <= 0 && subtotal > 0) {
      price = Math.floor(subtotal / quantity)
    }

    return {
      ...item,
      quantity,
      price: Math.max(0, price),
      productName: item.productName || '商品',
      productImage: item.productImage || '',
      specText: normalizeSpecText(item.specText || '')
    }
  },

  isValidAddress(address) {
    return !!(address && address.name && address.phone && address.province && address.city && address.district && address.detail)
  },

  getCachedAddress() {
    const selectedAddress = wx.getStorageSync('selectedAddress')
    if (this.isValidAddress(selectedAddress)) return selectedAddress

    const latestAddress = wx.getStorageSync('latestAddress')
    if (this.isValidAddress(latestAddress)) return latestAddress

    return null
  },

  // 更新价格显示
  updatePriceDisplay() {
    const { totalAmount, memberDiscount, discountAmount, payAmount, items } = this.data
    
    // 格式化商品价格
    const formattedItems = items.map(item => ({
      ...item,
      priceText: this.formatPrice(item.price)
    }))
    
    this.setData({
      items: formattedItems,
      totalAmountText: this.formatPrice(totalAmount),
      memberDiscountText: this.formatPrice(memberDiscount),
      discountAmountText: this.formatPrice(discountAmount),
      payAmountText: this.formatPrice(payAmount)
    })
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
      this.setData({
        items: items.map((item) => this.normalizeOrderItem(item))
      })
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
      this.setData({
        items: [this.normalizeOrderItem(item)]
      })
      wx.setStorageSync('buyNowItem', this.normalizeOrderItem(item))
    }

    // 加载数据
    this.calculatePrice()
    this.loadUserProfile()
    this.loadDefaultAddress()
  },

  onShow() {
    // 无论是否已有地址，从地址编辑/选择页返回都需要重新加载
    this.loadDefaultAddress()
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
      } else {
        this.setData({ memberLevel: 0 })
      }
    } catch (err) {
      // 静默失败
      console.error('加载用户信息失败', err)
      this.setData({ memberLevel: 0 })
    } finally {
      this.calculatePrice()
    }
  },

  // 加载默认收货地址
  async loadDefaultAddress(retryCount = 0) {
    const cachedAddress = this.getCachedAddress()

    try {
      const result = await wx.cloud.callFunction({
        name: 'getAddresses'
      })

      if (result.result.success) {
        const addresses = Array.isArray(result.result.data) ? result.result.data : []
        let address = null

        if (cachedAddress && cachedAddress._id) {
          address = addresses.find((item) => item._id === cachedAddress._id) || null
        }

        if (!address) {
          const defaultAddress = addresses.find((addr) => addr.isDefault)
          address = defaultAddress || addresses[0] || null
        }

        if (!address && cachedAddress) {
          address = cachedAddress
        }

        if (address) {
          wx.setStorageSync('selectedAddress', address)
        }

        wx.removeStorageSync('addressChanged')

        this.setData({
          address,
          hasAddress: !!address,
          loading: false
        })
        return
      } else {
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载地址失败:', error)
    }

    if (this.isValidAddress(cachedAddress)) {
      this.setData({
        address: cachedAddress,
        hasAddress: true,
        loading: false
      })
      return
    }

    const addressChanged = wx.getStorageSync('addressChanged')
    if (addressChanged && retryCount < 1) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      return this.loadDefaultAddress(retryCount + 1)
    }

    this.setData({
      address: null,
      hasAddress: false,
      loading: false
    })
  },

  // 计算价格
  calculatePrice() {
    const items = (Array.isArray(this.data.items) ? this.data.items : []).map((item) => this.normalizeOrderItem(item))
    const selectedCoupon = this.data.selectedCoupon
    const memberLevel = this.normalizeAmount(this.data.memberLevel, 0)

    // 计算商品总价（原价）
    const totalAmount = items.reduce((sum, item) => {
      return sum + this.normalizeAmount(item.price, 0) * this.normalizeAmount(item.quantity, 1)
    }, 0)

    // 计算会员折扣后的价格
    let memberDiscountedAmount = totalAmount
    let memberDiscount = 0
    
    if (memberLevel > 0) {
      memberDiscountedAmount = items.reduce((sum, item) => {
        const itemPrice = this.normalizeAmount(item.price, 0)
        const itemQty = this.normalizeAmount(item.quantity, 1)
        const memberPrice = calculateMemberPrice(itemPrice, memberLevel)
        return sum + memberPrice * itemQty
      }, 0)
      memberDiscount = totalAmount - memberDiscountedAmount
    }

    // 计算优惠券优惠金额（基于会员折扣后的价格）
    let couponDiscount = 0
    if (selectedCoupon) {
      const info = selectedCoupon.couponInfo || selectedCoupon
      const type = info.type
      const minAmount = Number(info.minAmount || info.minAmountText || 0)
      const value = Number(info.value || 0)
      if (type === 1) {
        if (memberDiscountedAmount >= minAmount) couponDiscount = value
      } else if (type === 2) {
        couponDiscount = Math.floor(memberDiscountedAmount * (100 - value) / 100)
      }
    }

    // 计算实付金额
    const payAmount = Math.max(memberDiscountedAmount - couponDiscount, 0)

    this.setData({
      items,
      totalAmount,
      memberDiscount,
      discountAmount: couponDiscount,
      payAmount
    })
    
    // 更新价格显示
    this.updatePriceDisplay()
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

  // 优惠券选择回调（保留完整对象含 _id/userCouponId，用于下单传 userCouponId）
  onCouponSelected(coupon) {
    this.setData({
      selectedCoupon: coupon || null
    })
    this.calculatePrice()
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  updateBuyQuantity(index, quantity, options = {}) {
    if (this.data.sourceType !== 'buy') return

    const { silent = false } = options
    const itemIndex = Number(index)
    const items = Array.isArray(this.data.items) ? [...this.data.items] : []
    const target = items[itemIndex]
    if (!target) return

    const stock = Math.max(0, this.normalizeAmount(target.stock, 9999))
    const input = Math.floor(this.normalizeAmount(quantity, 0))

    if (input <= 0) {
      this.setData({ items })
      if (!silent) {
        wx.showToast({
          title: '数量至少为1',
          icon: 'none'
        })
      }
      return
    }

    let nextQuantity = input
    if (stock > 0 && input > stock) {
      nextQuantity = stock
      if (!silent) {
        wx.showToast({
          title: `最多可买${stock}件`,
          icon: 'none'
        })
      }
    }

    items[itemIndex] = {
      ...target,
      quantity: nextQuantity
    }

    const nextItem = this.normalizeOrderItem(items[itemIndex])
    items[itemIndex] = nextItem

    this.setData({ items }, () => {
      this.calculatePrice()
    })
    wx.setStorageSync('buyNowItem', nextItem)
  },

  // 减少数量（立即购买场景）
  onDecreaseQuantity(e) {
    if (this.data.sourceType !== 'buy') return

    const index = Number(e.currentTarget.dataset.index || 0)
    const target = this.data.items[index]
    if (!target) return
    const currentQty = Math.max(1, this.normalizeAmount(target.quantity, 1))
    if (currentQty <= 1) return
    this.updateBuyQuantity(index, currentQty - 1, { silent: true })
  },

  // 增加数量（立即购买场景）
  onIncreaseQuantity(e) {
    if (this.data.sourceType !== 'buy') return

    const index = Number(e.currentTarget.dataset.index || 0)
    const target = this.data.items[index]
    if (!target) return

    const currentQty = Math.max(1, this.normalizeAmount(target.quantity, 1))
    const stock = Math.max(0, this.normalizeAmount(target.stock, 9999))

    if (currentQty >= stock) {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      })
      return
    }

    this.updateBuyQuantity(index, currentQty + 1, { silent: true })
  },

  onInputQuantity(e) {
    if (this.data.sourceType !== 'buy') return

    const index = Number(e.currentTarget.dataset.index || 0)
    const inputValue = e && e.detail ? e.detail.value : ''
    this.updateBuyQuantity(index, inputValue)
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
      // 准备订单数据（仅传必要字段，金额由服务端重算，防篡改）
      const orderData = {
        items: this.data.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          skuCode: item.skuCode,
          specText: item.specText,
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          cartItemId: item.cartItemId || item._id || null
        })),
        address: {
          name: this.data.address.name,
          phone: this.data.address.phone,
          province: this.data.address.province,
          city: this.data.address.city,
          district: this.data.address.district,
          detail: this.data.address.detail
        },
        userCouponId: this.data.selectedCoupon ? this.data.selectedCoupon._id : null,
        remark: this.data.remark
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
