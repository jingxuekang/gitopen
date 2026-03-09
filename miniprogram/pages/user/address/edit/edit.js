// 地址编辑页面
Page({
  data: {
    addressId: null,
    isEdit: false,
    
    // 表单数据
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: false,
    
    // 省市区数据
    regions: [],
    regionIndex: [0, 0, 0],
    
    submitting: false
  },

  onLoad(options) {
    const addressId = options.id
    
    if (addressId) {
      // 编辑模式
      this.setData({
        addressId,
        isEdit: true
      })
      this.loadAddressDetail(addressId)
    }
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: addressId ? '编辑地址' : '添加地址'
    })
  },

  // 加载地址详情
  async loadAddressDetail(addressId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'getAddresses'
      })

      wx.hideLoading()

      if (result.result.success) {
        const address = result.result.data.find(addr => addr._id === addressId)
        
        if (address) {
          this.setData({
            name: address.name,
            phone: address.phone,
            province: address.province,
            city: address.city,
            district: address.district,
            detail: address.detail,
            isDefault: address.isDefault
          })
        }
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载地址详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    })
  },

  // 选择省市区
  onRegionChange(e) {
    const values = e.detail.value
    this.setData({
      province: values[0],
      city: values[1],
      district: values[2]
    })
  },

  // 输入详细地址
  onDetailInput(e) {
    this.setData({
      detail: e.detail.value
    })
  },

  // 切换默认地址
  onDefaultChange(e) {
    this.setData({
      isDefault: e.detail.value
    })
  },

  // 表单验证
  validateForm() {
    const { name, phone, province, city, district, detail } = this.data

    if (!name || !name.trim()) {
      wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      })
      return false
    }

    if (!phone || !phone.trim()) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return false
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      })
      return false
    }

    if (!province || !city || !district) {
      wx.showToast({
        title: '请选择省市区',
        icon: 'none'
      })
      return false
    }

    if (!detail || !detail.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) {
      return
    }

    if (this.data.submitting) {
      return
    }

    this.setData({ submitting: true })

    try {
      const { addressId, isEdit, name, phone, province, city, district, detail, isDefault } = this.data

      const addressData = {
        name: name.trim(),
        phone: phone.trim(),
        province,
        city,
        district,
        detail: detail.trim(),
        isDefault
      }

      let result

      if (isEdit) {
        // 更新地址
        result = await wx.cloud.callFunction({
          name: 'updateAddress',
          data: {
            addressId,
            ...addressData
          }
        })
      } else {
        // 添加地址
        result = await wx.cloud.callFunction({
          name: 'addAddress',
          data: addressData
        })
      }

      this.setData({ submitting: false })

      if (result.result.success) {
        wx.showToast({
          title: isEdit ? '保存成功' : '添加成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: result.result.message || '操作失败',
          icon: 'none'
        })
      }
    } catch (error) {
      this.setData({ submitting: false })
      console.error('保存地址失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }
})
