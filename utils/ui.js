// UI交互工具函数

/**
 * 显示Toast提示（优化版）
 * @param {string} title - 提示文字
 * @param {string} icon - 图标类型: success, error, loading, none
 * @param {number} duration - 持续时间（毫秒）
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration,
    mask: true // 防止用户在提示期间进行其他操作
  })
}

/**
 * 显示成功提示
 */
function showSuccess(title = '操作成功', duration = 2000) {
  showToast(title, 'success', duration)
}

/**
 * 显示错误提示
 */
function showError(title = '操作失败', duration = 2000) {
  showToast(title, 'error', duration)
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示确认对话框（优化版）
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} - 用户是否确认
 */
function showConfirm(options = {}) {
  const {
    title = '提示',
    content = '',
    confirmText = '确定',
    cancelText = '取消',
    confirmColor = '#2C5F2D',
    cancelColor = '#666666'
  } = options

  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      confirmColor,
      cancelColor,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 显示操作菜单
 * @param {Array<string>} itemList - 菜单项列表
 * @returns {Promise<number>} - 用户选择的索引，取消返回-1
 */
function showActionSheet(itemList) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      success: (res) => {
        resolve(res.tapIndex)
      },
      fail: () => {
        resolve(-1)
      }
    })
  })
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 */
function throttle(fn, delay = 500) {
  let timer = null
  let lastTime = 0
  
  return function(...args) {
    const now = Date.now()
    
    if (now - lastTime >= delay) {
      fn.apply(this, args)
      lastTime = now
    } else {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fn.apply(this, args)
        lastTime = Date.now()
      }, delay - (now - lastTime))
    }
  }
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 */
function debounce(fn, delay = 500) {
  let timer = null
  
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 页面跳转（带动画优化）
 */
function navigateTo(url, options = {}) {
  const { animationType = 'pop-in', animationDuration = 300 } = options
  
  wx.navigateTo({
    url,
    success: () => {
      // 页面跳转成功
    },
    fail: (err) => {
      console.error('页面跳转失败', err)
      showError('页面跳转失败')
    }
  })
}

/**
 * 返回上一页
 */
function navigateBack(delta = 1) {
  wx.navigateBack({
    delta,
    fail: () => {
      // 如果没有上一页，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  })
}

/**
 * 下拉刷新辅助函数
 * @param {Function} loadDataFn - 加载数据的函数
 */
async function handlePullDownRefresh(loadDataFn) {
  try {
    await loadDataFn()
  } finally {
    wx.stopPullDownRefresh()
  }
}

/**
 * 上拉加载更多辅助函数
 * @param {Object} context - 页面上下文
 * @param {Function} loadMoreFn - 加载更多数据的函数
 */
async function handleReachBottom(context, loadMoreFn) {
  // 防止重复加载
  if (context.data.loading || context.data.noMore) {
    return
  }

  context.setData({ loading: true })

  try {
    const hasMore = await loadMoreFn()
    if (!hasMore) {
      context.setData({ noMore: true })
      showToast('没有更多了', 'none', 1500)
    }
  } catch (err) {
    showError('加载失败')
  } finally {
    context.setData({ loading: false })
  }
}

/**
 * 复制文本到剪贴板
 */
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: () => {
        showSuccess('已复制到剪贴板')
        resolve()
      },
      fail: (err) => {
        showError('复制失败')
        reject(err)
      }
    })
  })
}

/**
 * 拨打电话
 */
function makePhoneCall(phoneNumber) {
  wx.makePhoneCall({
    phoneNumber,
    fail: () => {
      showError('拨打失败')
    }
  })
}

/**
 * 预览图片
 */
function previewImage(current, urls) {
  wx.previewImage({
    current,
    urls
  })
}

/**
 * 保存图片到相册
 */
function saveImageToPhotosAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        showSuccess('已保存到相册')
        resolve()
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          showError('请授权访问相册')
        } else {
          showError('保存失败')
        }
        reject(err)
      }
    })
  })
}

/**
 * 获取系统信息（用于适配）
 */
function getSystemInfo() {
  return new Promise((resolve) => {
    wx.getSystemInfo({
      success: (res) => {
        resolve(res)
      },
      fail: () => {
        resolve(null)
      }
    })
  })
}

/**
 * 计算安全区域（适配刘海屏）
 */
async function getSafeArea() {
  const systemInfo = await getSystemInfo()
  if (!systemInfo) return { top: 0, bottom: 0 }

  const { safeArea, screenHeight, statusBarHeight } = systemInfo
  
  return {
    top: statusBarHeight || 0,
    bottom: screenHeight - (safeArea?.bottom || screenHeight)
  }
}

module.exports = {
  showToast,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showConfirm,
  showActionSheet,
  throttle,
  debounce,
  navigateTo,
  navigateBack,
  handlePullDownRefresh,
  handleReachBottom,
  copyToClipboard,
  makePhoneCall,
  previewImage,
  saveImageToPhotosAlbum,
  getSystemInfo,
  getSafeArea
}
