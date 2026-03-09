// 地址列表页面
Page({
  data: {
    addresses: [],
    loading: true,
    mode: 'manage', // manage-管理模式, select-选择模式
    selectedAddressId: null
  },

  onLoad(options) {
    const mode = options.mode || 'manage'
    this.setData({ mode })
    this.loadAddresses()
  },

  onShow() {
    // 从编辑页面返回时重新加载
    this.loadAddresses()
  },

  // 加载地址列表
  async loadAddresses() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getAddresses'
      })

      if (result.result.success) {
        this.setData({
          addresses: result.result.data,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载地址列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 选择地址（选择模式）
  onSelectAddress(e) {
    if (this.data.mode !== 'select') {
      return
    }

    const addressId = e.currentTarget.dataset.id
    const address = this.data.addresses.find(addr => addr._id === addressId)

    if (address) {
      // 将选中的地址存储到全局数据或通过事件传递
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      
      if (prevPage) {
        prevPage.setData({
          address: address,
          hasAddress: true
        })
      }

      wx.navigateBack()
    }
  },

  // 编辑地址
  onEditAddress(e) {
    const addressId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/user/address/edit/edit?id=${addressId}`
    })
  },

  // 删除地址
  onDeleteAddress(e) {
    const addressId = e.currentTarget.dataset.id
    const address = this.data.addresses.find(addr => addr._id === addressId)

    wx.showModal({
      title: '提示',
      content: `确定要删除地址"${address.name} ${address.phone}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const result = await wx.cloud.callFunction({
              name: 'deleteAddress',
              data: { addressId }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadAddresses()
            } else {
              wx.showToast({
                title: result.result.message || '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('删除地址失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 设为默认地址
  async onSetDefault(e) {
    const addressId = e.currentTarget.dataset.id

    try {
      wx.showLoading({ title: '设置中...' })

      const result = await wx.cloud.callFunction({
        name: 'updateAddress',
        data: {
          addressId,
          isDefault: true
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        })
        this.loadAddresses()
      } else {
        wx.showToast({
          title: result.result.message || '设置失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('设置默认地址失败:', error)
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      })
    }
  },

  // 添加新地址
  onAddAddress() {
    wx.navigateTo({
      url: '/pages/user/address/edit/edit'
    })
  }
})
