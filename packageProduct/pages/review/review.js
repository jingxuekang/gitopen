// 评价页面
Page({
  data: {
    orderId: '',
    productId: '',
    skuCode: '',
    productInfo: null,
    orderItems: [],
    selectedItemIndex: -1,
    currentItemReviewed: false,
    loadingOrder: true,
    rating: 5,
    content: '',
    images: [],
    maxImages: 9,
    submitting: false
  },

  normalizeSkuCode(skuCode) {
    return typeof skuCode === 'string' ? skuCode : ''
  },

  formatPrice(price) {
    const value = Number(price) || 0
    return (value / 100).toFixed(2)
  },

  onLoad(options) {
    const { orderId } = options || {}

    if (!orderId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.setData({ orderId })
    this.loadOrderReviewItems(options || {})
  },

  resolveInitialItemIndex(items, options) {
    const optionProductId = options.productId || ''
    const optionSkuCode = this.normalizeSkuCode(options.skuCode)

    if (optionProductId) {
      const exactIndex = items.findIndex(item => {
        if (item.productId !== optionProductId) {
          return false
        }

        if (!optionSkuCode) {
          return true
        }

        return this.normalizeSkuCode(item.skuCode) === optionSkuCode
      })

      if (exactIndex >= 0 && items[exactIndex].reviewed !== true) {
        return exactIndex
      }
    }

    const firstPendingIndex = items.findIndex(item => item.reviewed !== true)
    if (firstPendingIndex >= 0) {
      return firstPendingIndex
    }

    return items.length > 0 ? 0 : -1
  },

  buildOrderItems(order) {
    const list = Array.isArray(order.items) ? order.items : []

    return list.map((item, index) => {
      const skuCode = this.normalizeSkuCode(item.skuCode)
      const specText = item.specText ||
        (Array.isArray(item.specValues) ? item.specValues.join(' ') : '') ||
        '默认规格'

      return {
        ...item,
        skuCode,
        reviewed: item.reviewed === true,
        specText,
        priceText: this.formatPrice(item.price),
        itemKey: `${item.productId || 'product'}_${skuCode}_${index}`
      }
    })
  },

  applySelectedItem(index, resetForm = false) {
    const item = this.data.orderItems[index]
    if (!item) {
      return
    }

    if (resetForm) {
      this.setData({
        rating: 5,
        content: '',
        images: []
      })
    }

    this.setData({
      selectedItemIndex: index,
      productId: item.productId || '',
      skuCode: this.normalizeSkuCode(item.skuCode),
      currentItemReviewed: item.reviewed === true,
      productInfo: {
        name: item.productName || '商品',
        image: item.productImage || ''
      }
    })
  },

  async loadOrderReviewItems(options) {
    this.setData({ loadingOrder: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: {
          orderId: this.data.orderId
        }
      })

      if (!result.result || !result.result.success) {
        wx.showToast({
          title: (result.result && result.result.message) || '订单加载失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      const order = result.result.data || {}
      if (order.status !== 3) {
        wx.showToast({
          title: '订单完成后才可评价',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      const orderItems = this.buildOrderItems(order)
      if (orderItems.length === 0) {
        wx.showToast({
          title: '订单中没有可评价商品',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      const hasPendingItem = orderItems.some(item => item.reviewed !== true)
      if (!hasPendingItem) {
        wx.showToast({
          title: '该订单已全部评价',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      const initialIndex = this.resolveInitialItemIndex(orderItems, options)

      this.setData({
        orderItems,
        loadingOrder: false
      })

      this.applySelectedItem(initialIndex >= 0 ? initialIndex : 0, true)
    } catch (error) {
      console.error('加载可评价商品失败:', error)
      this.setData({ loadingOrder: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onSelectItem(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) {
      return
    }

    const item = this.data.orderItems[index]
    if (!item) {
      return
    }

    if (item.reviewed === true) {
      wx.showToast({
        title: '该商品已评价',
        icon: 'none'
      })
      return
    }

    this.applySelectedItem(index, true)
  },

  // 选择评分
  onRatingChange(e) {
    this.setData({
      rating: parseInt(e.currentTarget.dataset.value, 10)
    })
  },

  // 输入评价内容
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    })
  },

  // 选择图片
  onChooseImage() {
    const remainCount = this.data.maxImages - this.data.images.length

    if (remainCount <= 0) {
      wx.showToast({
        title: `最多上传${this.data.maxImages}张图片`,
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths)
      }
    })
  },

  // 上传图片
  async uploadImages(tempFilePaths) {
    if (!Array.isArray(tempFilePaths) || tempFilePaths.length === 0) {
      return
    }

    wx.showLoading({ title: '上传中...' })

    try {
      const uploadPromises = tempFilePaths.map(filePath => {
        const cloudPath = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        return wx.cloud.uploadFile({
          cloudPath,
          filePath
        })
      })

      const results = await Promise.all(uploadPromises)
      const imageUrls = results.map(res => res.fileID).filter(Boolean)

      this.setData({
        images: [...this.data.images, ...imageUrls]
      })

      wx.hideLoading()
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('上传图片失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    })
  },

  // 删除图片
  onDeleteImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 提交评价
  async onSubmit() {
    if (this.data.submitting || this.data.loadingOrder) {
      return
    }

    const currentItem = this.data.orderItems[this.data.selectedItemIndex]
    if (!currentItem) {
      wx.showToast({
        title: '请选择待评价商品',
        icon: 'none'
      })
      return
    }

    if (currentItem.reviewed === true) {
      wx.showToast({
        title: '该商品已评价',
        icon: 'none'
      })
      return
    }

    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请填写评价内容',
        icon: 'none'
      })
      return
    }

    try {
      this.setData({ submitting: true })
      wx.showLoading({ title: '提交中...' })

      const result = await wx.cloud.callFunction({
        name: 'submitReview',
        data: {
          orderId: this.data.orderId,
          productId: currentItem.productId,
          skuCode: this.normalizeSkuCode(currentItem.skuCode),
          rating: this.data.rating,
          content: this.data.content,
          images: this.data.images
        }
      })

      wx.hideLoading()
      this.setData({ submitting: false })

      if (!result.result || !result.result.success) {
        wx.showToast({
          title: (result.result && result.result.message) || '评价失败',
          icon: 'none'
        })
        return
      }

      const reviewId = result.result.data && result.result.data.reviewId
      const now = new Date()

      const nextItems = this.data.orderItems.map((item, index) => {
        if (index !== this.data.selectedItemIndex) {
          return item
        }

        return {
          ...item,
          reviewed: true,
          reviewId: reviewId || item.reviewId || '',
          reviewedAt: now
        }
      })

      const nextPendingIndex = nextItems.findIndex(item => item.reviewed !== true)

      this.setData({
        orderItems: nextItems
      })

      if (nextPendingIndex >= 0) {
        this.applySelectedItem(nextPendingIndex, true)
        wx.showToast({
          title: '评价成功，请继续',
          icon: 'success'
        })
      } else {
        this.setData({ currentItemReviewed: true })
        wx.showToast({
          title: '全部评价完成',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1200)
      }
    } catch (error) {
      wx.hideLoading()
      this.setData({ submitting: false })
      console.error('提交评价失败:', error)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  }
})
