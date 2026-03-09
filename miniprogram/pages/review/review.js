// 评价页面
Page({
  data: {
    orderId: '',
    productId: '',
    productInfo: null,
    rating: 5,
    content: '',
    images: [],
    maxImages: 9,
    submitting: false
  },

  onLoad(options) {
    const { orderId, productId, productName, productImage } = options
    
    if (!orderId || !productId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.setData({
      orderId,
      productId,
      productInfo: {
        name: productName,
        image: productImage
      }
    })
  },

  // 选择评分
  onRatingChange(e) {
    this.setData({
      rating: parseInt(e.currentTarget.dataset.value)
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
    wx.showLoading({ title: '上传中...' })

    try {
      const uploadPromises = tempFilePaths.map(filePath => {
        const cloudPath = `reviews/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`
        return wx.cloud.uploadFile({
          cloudPath,
          filePath
        })
      })

      const results = await Promise.all(uploadPromises)
      const imageUrls = results.map(res => res.fileID)

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
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    })
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 提交评价
  async onSubmit() {
    if (this.data.submitting) return

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
          productId: this.data.productId,
          rating: this.data.rating,
          content: this.data.content,
          images: this.data.images
        }
      })

      wx.hideLoading()
      this.setData({ submitting: false })

      if (result.result.success) {
        wx.showToast({
          title: '评价成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: result.result.message || '评价失败',
          icon: 'none'
        })
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
