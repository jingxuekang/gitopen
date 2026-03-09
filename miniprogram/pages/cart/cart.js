// pages/cart/cart.js
const util = require('../../utils/util.js')

Page({
  data: {
    items: [],           // 购物车商品列表
    totalPrice: 0,       // 总价（分）
    selectedCount: 0,    // 选中商品数量
    allSelected: false,  // 是否全选
    hasUnavailable: false // 是否有不可用商品被选中
  },

  onLoad() {
    this.loadCart()
  },

  onShow() {
    // 每次显示页面时刷新购物车
    this.loadCart()
  },

  /**
   * 加载购物车数据
   */
  loadCart() {
    util.showLoading('加载中...')
    
    wx.cloud.callFunction({
      name: 'getCart'
    }).then(res => {
      util.hideLoading()
      
      if (res.result.code === 0) {
        const { items, totalPrice, selectedCount } = res.result.data
        
        // 检查是否全选
        const allSelected = items.length > 0 && items.every(item => item.selected)
        
        // 检查是否有不可用商品被选中
        const hasUnavailable = items.some(item => item.selected && !item.available)
        
        this.setData({
          items,
          totalPrice,
          selectedCount,
          allSelected,
          hasUnavailable
        })
      } else {
        util.showToast(res.result.message)
      }
    }).catch(err => {
      util.hideLoading()
      console.error('加载购物车失败', err)
      util.showToast('加载失败，请重试')
    })
  },

  /**
   * 切换商品选中状态
   */
  toggleSelect(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.items.find(item => item._id === id)
    
    if (!item) return
    
    const newSelected = !item.selected
    
    wx.cloud.callFunction({
      name: 'updateCartItem',
      data: {
        cartItemId: id,
        selected: newSelected
      }
    }).then(res => {
      if (res.result.code === 0) {
        // 更新本地数据
        const items = this.data.items.map(item => {
          if (item._id === id) {
            return { ...item, selected: newSelected }
          }
          return item
        })
        
        // 重新计算总价和选中数量
        const selectedCount = items.filter(item => item.selected).length
        const totalPrice = items
          .filter(item => item.selected && item.available)
          .reduce((sum, item) => sum + item.subtotal, 0)
        
        const allSelected = items.length > 0 && items.every(item => item.selected)
        const hasUnavailable = items.some(item => item.selected && !item.available)
        
        this.setData({
          items,
          selectedCount,
          totalPrice,
          allSelected,
          hasUnavailable
        })
      } else {
        util.showToast(res.result.message)
      }
    }).catch(err => {
      console.error('更新选中状态失败', err)
      util.showToast('操作失败，请重试')
    })
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const newSelectAll = !this.data.allSelected
    const items = this.data.items
    
    // 批量更新所有商品的选中状态
    const updatePromises = items.map(item => {
      return wx.cloud.callFunction({
        name: 'updateCartItem',
        data: {
          cartItemId: item._id,
          selected: newSelectAll
        }
      })
    })
    
    util.showLoading('处理中...')
    
    Promise.all(updatePromises).then(results => {
      util.hideLoading()
      
      // 检查是否所有请求都成功
      const allSuccess = results.every(res => res.result.code === 0)
      
      if (allSuccess) {
        // 更新本地数据
        const updatedItems = items.map(item => ({
          ...item,
          selected: newSelectAll
        }))
        
        const selectedCount = newSelectAll ? items.length : 0
        const totalPrice = newSelectAll 
          ? items.filter(item => item.available).reduce((sum, item) => sum + item.subtotal, 0)
          : 0
        
        const hasUnavailable = newSelectAll && items.some(item => !item.available)
        
        this.setData({
          items: updatedItems,
          selectedCount,
          totalPrice,
          allSelected: newSelectAll,
          hasUnavailable
        })
      } else {
        util.showToast('部分操作失败')
        this.loadCart() // 重新加载购物车
      }
    }).catch(err => {
      util.hideLoading()
      console.error('全选操作失败', err)
      util.showToast('操作失败，请重试')
    })
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
   * 更新商品数量
   */
  updateQuantity(cartItemId, newQuantity) {
    wx.cloud.callFunction({
      name: 'updateCartItem',
      data: {
        cartItemId,
        quantity: newQuantity
      }
    }).then(res => {
      if (res.result.code === 0) {
        // 更新本地数据
        const items = this.data.items.map(item => {
          if (item._id === cartItemId) {
            const subtotal = item.price * newQuantity
            return { 
              ...item, 
              quantity: newQuantity,
              subtotal,
              available: item.stock >= newQuantity
            }
          }
          return item
        })
        
        // 重新计算总价
        const totalPrice = items
          .filter(item => item.selected && item.available)
          .reduce((sum, item) => sum + item.subtotal, 0)
        
        const hasUnavailable = items.some(item => item.selected && !item.available)
        
        this.setData({
          items,
          totalPrice,
          hasUnavailable
        })
      } else if (res.result.code === 409) {
        // 库存不足
        util.showToast('库存不足')
        this.loadCart() // 重新加载获取最新库存
      } else {
        util.showToast(res.result.message)
      }
    }).catch(err => {
      console.error('更新数量失败', err)
      util.showToast('操作失败，请重试')
    })
  },

  /**
   * 删除单个商品
   */
  deleteItem(e) {
    const { id } = e.currentTarget.dataset
    
    util.showConfirm('确定要删除该商品吗？').then(() => {
      util.showLoading('删除中...')
      
      wx.cloud.callFunction({
        name: 'deleteCartItem',
        data: {
          cartItemId: id
        }
      }).then(res => {
        util.hideLoading()
        
        if (res.result.code === 0) {
          util.showToast('删除成功', 'success')
          this.loadCart()
        } else {
          util.showToast(res.result.message)
        }
      }).catch(err => {
        util.hideLoading()
        console.error('删除商品失败', err)
        util.showToast('删除失败，请重试')
      })
    }).catch(() => {
      // 用户取消删除
    })
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
    
    util.showConfirm(`确定要删除选中的${selectedItems.length}件商品吗？`).then(() => {
      util.showLoading('删除中...')
      
      const cartItemIds = selectedItems.map(item => item._id)
      
      wx.cloud.callFunction({
        name: 'deleteCartItem',
        data: {
          cartItemIds
        }
      }).then(res => {
        util.hideLoading()
        
        if (res.result.code === 0) {
          util.showToast('删除成功', 'success')
          this.loadCart()
        } else {
          util.showToast(res.result.message)
        }
      }).catch(err => {
        util.hideLoading()
        console.error('批量删除失败', err)
        util.showToast('删除失败，请重试')
      })
    }).catch(() => {
      // 用户取消删除
    })
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
    
    // 跳转到订单确认页面
    wx.navigateTo({
      url: '/pages/order/confirm/confirm'
    })
  },

  /**
   * 去逛逛
   */
  goShopping() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})
