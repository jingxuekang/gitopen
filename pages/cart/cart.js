// pages/cart/cart.js
const util = require('../../utils/util.js')
const { cartApi } = require('../../utils/api.js')

const normalizeNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

Page({
  data: {
    items: [],           // 购物车商品列表
    totalPrice: 0,       // 总价（分）
    selectedCount: 0,    // 选中商品数量
    allSelected: false,  // 是否全选
    hasUnavailable: false // 是否有不可用商品被选中
  },

  normalizeSpecText(value) {
    if (util && typeof util.normalizeSpecText === 'function') {
      return util.normalizeSpecText(value)
    }
    return String(value || '')
  },

  normalizeCartItem(item = {}) {
    return {
      ...item,
      specText: this.normalizeSpecText(item.specText || '')
    }
  },

  normalizeCartItems(items = []) {
    return (Array.isArray(items) ? items : []).map((item) => this.normalizeCartItem(item))
  },

  onLoad() {
    this.loadCart()
  },

  onShow() {
    // 每次显示页面时刷新购物车
    this.loadCart()
  },

  /**
   * 加载购物车数据   */
  async loadCart() {
    util.showLoading('加载中..')
    try {
      const data = await cartApi.getCart()
      this.applyCartData(data)
    } catch (err) {
      console.error('加载购物车失败', err)
      util.showToast('获取购物车失败')
    } finally {
      util.hideLoading()
    }
  },

  applyCartData(data = {}) {
    const items = this.normalizeCartItems(Array.isArray(data.items) ? data.items : [])
    const selectedCount = items.filter((item) => item.selected).length
    const totalPrice = items
      .filter((item) => item.selected && item.available)
      .reduce((sum, item) => sum + normalizeNumber(item.subtotal, 0), 0)
    const allSelected = items.length > 0 && items.every((item) => item.selected)
    const hasUnavailable = items.some((item) => item.selected && !item.available)

    this.setData({
      items,
      totalPrice: normalizeNumber(data.totalPrice, totalPrice),
      selectedCount: normalizeNumber(data.selectedCount, selectedCount),
      allSelected,
      hasUnavailable
    })
  },

  recalcByItems(items = []) {
    const normalizedItems = this.normalizeCartItems(items)
    const selectedCount = normalizedItems.filter((item) => item.selected).length
    const totalPrice = normalizedItems
      .filter((item) => item.selected && item.available)
      .reduce((sum, item) => sum + normalizeNumber(item.subtotal, 0), 0)
    const allSelected = normalizedItems.length > 0 && normalizedItems.every((item) => item.selected)
    const hasUnavailable = normalizedItems.some((item) => item.selected && !item.available)

    this.setData({
      items: normalizedItems,
      selectedCount,
      totalPrice,
      allSelected,
      hasUnavailable
    })
  },

  /**
   * 更新商品数量   */
  async toggleSelect(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.items.find(item => item._id === id)
    
    if (!item) return
    
    const newSelected = !item.selected

    try {
      await cartApi.updateCartItem(id, { selected: newSelected })
      const items = this.data.items.map((current) => {
        if (current._id !== id) return current
        return {
          ...current,
          selected: newSelected
        }
      })
      this.recalcByItems(items)
    } catch (err) {
        console.error('更新数量失败', err)
      util.showToast(err && err.message ? err.message : '操作失败，请重试')
    }
  },

  /**
   * 切换商品选中状态   */
  async toggleSelectAll() {
    const newSelectAll = !this.data.allSelected
    const items = this.data.items

    if (items.length === 0) return

    util.showLoading('处理中..')
    try {
      await Promise.all(items.map((item) => cartApi.updateCartItem(item._id, { selected: newSelectAll })))
      const updatedItems = items.map((item) => ({
        ...item,
        selected: newSelectAll
      }))
      this.recalcByItems(updatedItems)
    } catch (err) {
        console.error('切换选中失败', err)
      util.showToast(err && err.message ? err.message : '操作失败，请重试')
      this.loadCart()
    } finally {
      util.hideLoading()
    }
  },

  /**
   * 减少商品数量
   */
  decreaseQuantity(e) {
    const { id, quantity } = e.currentTarget.dataset
    
    if (quantity <= 1) {
      return
    }
    
    this.updateQuantity(id, quantity - 1)
  },

  /**
   * 增加商品数量
   */
  increaseQuantity(e) {
    const { id, quantity, stock } = e.currentTarget.dataset
    
    if (quantity >= stock) {
      util.showToast('库存不足')
      return
    }
    
    this.updateQuantity(id, quantity + 1)
  },

  /**
   * 切换全选/取消全选   */
  onQuantityBlur(e) {
    const { id, quantity, stock } = e.currentTarget.dataset || {}
    const rawValue = e && e.detail ? e.detail.value : ''
    const currentQuantity = Math.max(1, Math.floor(normalizeNumber(quantity, 1)))
    const stockLimit = Math.max(0, Math.floor(normalizeNumber(stock, 0)))
    const inputQuantity = Math.floor(normalizeNumber(rawValue, 0))

    // 非法输入直接还原当前数量
    if (inputQuantity <= 0) {
      this.recalcByItems(this.data.items)
        util.showToast('请先选择商品')
      return
    }

    let nextQuantity = inputQuantity
    if (stockLimit > 0 && inputQuantity > stockLimit) {
      nextQuantity = stockLimit
        util.showToast(`库存不足，最多购买${stockLimit}件`)
    }

    if (!id || nextQuantity === currentQuantity) {
      this.recalcByItems(this.data.items)
      return
    }

    this.updateQuantity(id, nextQuantity)
  },

  /**
   * 更新商品数量
   */
  async updateQuantity(cartItemId, newQuantity) {
    try {
      await cartApi.updateCartItem(cartItemId, { quantity: newQuantity })
      const items = this.data.items.map((item) => {
        if (item._id !== cartItemId) return item
        const subtotal = normalizeNumber(item.price, 0) * newQuantity
        return this.normalizeCartItem({
          ...item,
          quantity: newQuantity,
          subtotal,
          available: normalizeNumber(item.stock, 0) >= newQuantity
        })
      })
      this.recalcByItems(items)
    } catch (err) {
      console.error('更新数量失败', err)
      if (Number(err && err.code) === 409) {
        util.showToast('库存不足')
        this.loadCart()
        return
      }
      util.showToast(err && err.message ? err.message : '操作失败，请重试')
    }
  },

  /**
   * 删除单个商品
   */
  deleteItem(e) {
    const { id } = e.currentTarget.dataset
    
    util.showConfirm('确定要删除该商品吗？').then(() => {
      this.deleteItemInternal(id)
    }).catch(() => {
      // 用户取消删除
    })
  },

  async deleteItemInternal(id) {
    util.showLoading('处理中..')
    try {
      await cartApi.deleteCartItem(id)
      util.showToast('删除成功', 'success')
      this.loadCart()
    } catch (err) {
      console.error('删除商品失败', err)
      util.showToast(err && err.message ? err.message : '删除失败，请重试')
    } finally {
      util.hideLoading()
    }
  },

  /**
   * 批量删除选中商品
   */
  batchDelete() {
    const selectedItems = this.data.items.filter(item => item.selected)
    
    if (selectedItems.length === 0) {
      util.showToast('请先选择要删除的商品')
      return
    }
    
    util.showConfirm(`确定删除选中的${selectedItems.length}件商品吗？`).then(() => {
      const cartItemIds = selectedItems.map(item => item._id)
      this.batchDeleteInternal(cartItemIds)
    }).catch(() => {
      // 用户取消删除
    })
  },

  async batchDeleteInternal(cartItemIds = []) {
    util.showLoading('删除中..')
    try {
      await cartApi.deleteCartItem(cartItemIds)
      util.showToast('删除成功', 'success')
      this.loadCart()
    } catch (err) {
      console.error('批量删除失败', err)
      util.showToast(err && err.message ? err.message : '删除失败，请重试')
    } finally {
      util.hideLoading()
    }
  },

  /**
   * 去结算
   */
  checkout() {
    if (this.data.selectedCount === 0) {
      util.showToast('请选择要结算的商品')
      return
    }
    
    if (this.data.hasUnavailable) {
      util.showToast('选中的商品中有库存不足的商品')
      return
    }
    
    const orderItems = this.data.items
      .filter((item) => item.selected && item.available)
      .map((item) => ({
        cartItemId: item._id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        skuCode: item.skuCode,
        specText: this.normalizeSpecText(item.specText),
        price: normalizeNumber(item.price, 0),
        quantity: normalizeNumber(item.quantity, 1),
        subtotal: normalizeNumber(item.subtotal, 0),
        stock: normalizeNumber(item.stock, 0)
      }))

    wx.setStorageSync('orderItems', orderItems)

    // 跳转到确认订单页面
    wx.navigateTo({
      url: '/pages/order/confirm/confirm?sourceType=cart'
    })
  },

  /**
   * 计算价格
   */
  goShopping() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})
