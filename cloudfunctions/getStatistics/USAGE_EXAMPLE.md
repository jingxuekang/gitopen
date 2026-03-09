# getStatistics 云函数使用示例

## 小程序端调用示例

### 1. 获取今日统计数据

```javascript
// pages/admin/statistics/statistics.js
Page({
  data: {
    todayStats: null
  },

  onLoad() {
    this.getTodayStatistics()
  },

  // 获取今日统计
  async getTodayStatistics() {
    wx.showLoading({ title: '加载中...' })

    try {
      const today = new Date()
      const startDate = new Date(today.setHours(0, 0, 0, 0))
      const endDate = new Date()

      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          type: 'daily',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      })

      if (res.result.success) {
        this.setData({
          todayStats: {
            orderCount: res.result.data.orderCount,
            totalSales: (res.result.data.totalSales / 100).toFixed(2), // 转换为元
            newUserCount: res.result.data.newUserCount
          }
        })
      } else {
        wx.showToast({
          title: res.result.message,
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('获取今日统计失败:', error)
      wx.showToast({
        title: '获取统计数据失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
```

### 2. 获取指定日期范围的统计

```javascript
// pages/admin/statistics/statistics.js
Page({
  data: {
    startDate: '',
    endDate: '',
    rangeStats: null
  },

  // 选择开始日期
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
  },

  // 选择结束日期
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
  },

  // 查询统计数据
  async queryStatistics() {
    if (!this.data.startDate || !this.data.endDate) {
      wx.showToast({
        title: '请选择日期范围',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '查询中...' })

    try {
      const startDate = new Date(this.data.startDate + ' 00:00:00')
      const endDate = new Date(this.data.endDate + ' 23:59:59')

      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          type: 'daily',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      })

      if (res.result.success) {
        this.setData({
          rangeStats: {
            orderCount: res.result.data.orderCount,
            totalSales: (res.result.data.totalSales / 100).toFixed(2),
            newUserCount: res.result.data.newUserCount
          }
        })
      }
    } catch (error) {
      console.error('查询统计失败:', error)
      wx.showToast({
        title: '查询失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
```

### 3. 获取热销商品排行榜

```javascript
// pages/admin/hot-products/hot-products.js
Page({
  data: {
    hotProducts: [],
    dateRange: 30 // 默认最近30天
  },

  onLoad() {
    this.getHotProducts()
  },

  // 获取热销商品
  async getHotProducts() {
    wx.showLoading({ title: '加载中...' })

    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - this.data.dateRange * 24 * 60 * 60 * 1000)

      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          type: 'hotProducts',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      })

      if (res.result.success) {
        const hotProducts = res.result.data.hotProducts.map((item, index) => ({
          ...item,
          rank: index + 1,
          salesAmount: (item.salesAmount / 100).toFixed(2) // 转换为元
        }))

        this.setData({ hotProducts })
      }
    } catch (error) {
      console.error('获取热销商品失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换日期范围
  onDateRangeChange(e) {
    this.setData({
      dateRange: parseInt(e.detail.value)
    })
    this.getHotProducts()
  }
})
```

### 4. 获取用户地域分布

```javascript
// pages/admin/region/region.js
Page({
  data: {
    provinceStats: [],
    cityStats: [],
    currentTab: 0 // 0-省份 1-城市
  },

  onLoad() {
    this.getRegionStatistics()
  },

  // 获取地域统计
  async getRegionStatistics() {
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          type: 'userRegion'
        }
      })

      if (res.result.success) {
        const provinceStats = res.result.data.provinceStats.map(item => ({
          ...item,
          salesAmount: (item.salesAmount / 100).toFixed(2)
        }))

        const cityStats = res.result.data.cityStats.map(item => ({
          ...item,
          salesAmount: (item.salesAmount / 100).toFixed(2)
        }))

        this.setData({
          provinceStats,
          cityStats
        })
      }
    } catch (error) {
      console.error('获取地域统计失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换Tab
  onTabChange(e) {
    this.setData({
      currentTab: e.detail.index
    })
  }
})
```

### 5. 获取商品统计数据

```javascript
// pages/admin/product-stats/product-stats.js
Page({
  data: {
    productStats: [],
    dateRange: 30
  },

  onLoad() {
    this.getProductStatistics()
  },

  // 获取商品统计
  async getProductStatistics() {
    wx.showLoading({ title: '加载中...' })

    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - this.data.dateRange * 24 * 60 * 60 * 1000)

      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          type: 'product',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      })

      if (res.result.success) {
        // 按销售量排序
        const productStats = res.result.data.products
          .sort((a, b) => b.salesCount - a.salesCount)
          .map(item => ({
            ...item,
            // 计算转化率
            cartRate: item.viewCount > 0 
              ? ((item.addToCartCount / item.viewCount) * 100).toFixed(2) 
              : '0.00',
            purchaseRate: item.addToCartCount > 0 
              ? ((item.salesCount / item.addToCartCount) * 100).toFixed(2) 
              : '0.00'
          }))

        this.setData({ productStats })
      }
    } catch (error) {
      console.error('获取商品统计失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
```

### 6. 获取综合统计数据（仪表盘）

```javascript
// pages/admin/dashboard/dashboard.js
Page({
  data: {
    overview: null,
    loading: true
  },

  onLoad() {
    this.getOverviewStatistics()
  },

  // 获取综合统计
  async getOverviewStatistics() {
    this.setData({ loading: true })

    try {
      const today = new Date()
      const startDate = new Date(today.setHours(0, 0, 0, 0))
      const endDate = new Date()

      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          type: 'overview',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      })

      if (res.result.success) {
        const data = res.result.data

        this.setData({
          overview: {
            // 今日数据
            todayOrderCount: data.daily.orderCount,
            todayTotalSales: (data.daily.totalSales / 100).toFixed(2),
            todayNewUsers: data.daily.newUserCount,

            // 热销商品（前5名）
            topProducts: data.hotProducts.slice(0, 5).map(item => ({
              ...item,
              salesAmount: (item.salesAmount / 100).toFixed(2)
            })),

            // 地域分布（前5名）
            topProvinces: data.region.topProvinces.slice(0, 5).map(item => ({
              ...item,
              salesAmount: (item.salesAmount / 100).toFixed(2)
            })),

            // 总体数据
            totalUsers: data.totals.totalUsers,
            totalProducts: data.totals.totalProducts,
            totalOrders: data.totals.totalOrders
          },
          loading: false
        })
      }
    } catch (error) {
      console.error('获取综合统计失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.getOverviewStatistics().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})
```

## WXML 模板示例

### 今日统计卡片
```xml
<!-- pages/admin/dashboard/dashboard.wxml -->
<view class="stats-card">
  <view class="card-title">今日数据</view>
  <view class="stats-row">
    <view class="stat-item">
      <text class="stat-value">{{overview.todayOrderCount}}</text>
      <text class="stat-label">订单数</text>
    </view>
    <view class="stat-item">
      <text class="stat-value">¥{{overview.todayTotalSales}}</text>
      <text class="stat-label">销售额</text>
    </view>
    <view class="stat-item">
      <text class="stat-value">{{overview.todayNewUsers}}</text>
      <text class="stat-label">新增用户</text>
    </view>
  </view>
</view>
```

### 热销商品列表
```xml
<!-- pages/admin/hot-products/hot-products.wxml -->
<view class="hot-products">
  <view class="product-item" wx:for="{{hotProducts}}" wx:key="productId">
    <view class="rank">{{item.rank}}</view>
    <image class="product-image" src="{{item.productImage}}" mode="aspectFill" />
    <view class="product-info">
      <text class="product-name">{{item.productName}}</text>
      <text class="product-sales">销量：{{item.salesCount}}</text>
    </view>
    <view class="product-amount">¥{{item.salesAmount}}</view>
  </view>
</view>
```

### 地域分布列表
```xml
<!-- pages/admin/region/region.wxml -->
<view class="region-stats">
  <view class="tabs">
    <view class="tab {{currentTab === 0 ? 'active' : ''}}" bindtap="onTabChange" data-index="0">
      省份分布
    </view>
    <view class="tab {{currentTab === 1 ? 'active' : ''}}" bindtap="onTabChange" data-index="1">
      城市分布
    </view>
  </view>

  <view class="region-list" wx:if="{{currentTab === 0}}">
    <view class="region-item" wx:for="{{provinceStats}}" wx:key="province">
      <view class="region-name">{{item.province}}</view>
      <view class="region-data">
        <text>订单：{{item.orderCount}}</text>
        <text>用户：{{item.userCount}}</text>
        <text>销售额：¥{{item.salesAmount}}</text>
      </view>
    </view>
  </view>

  <view class="region-list" wx:if="{{currentTab === 1}}">
    <view class="region-item" wx:for="{{cityStats}}" wx:key="city">
      <view class="region-name">{{item.city}}</view>
      <view class="region-data">
        <text>订单：{{item.orderCount}}</text>
        <text>用户：{{item.userCount}}</text>
        <text>销售额：¥{{item.salesAmount}}</text>
      </view>
    </view>
  </view>
</view>
```

## 工具函数

### 日期格式化
```javascript
// utils/dateUtil.js
export function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDateRange(days) {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
}

export function getTodayRange() {
  const today = new Date()
  const startDate = new Date(today.setHours(0, 0, 0, 0))
  const endDate = new Date()
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
}
```

### 金额格式化
```javascript
// utils/formatUtil.js
export function formatAmount(amount) {
  // 将分转换为元，保留两位小数
  return (amount / 100).toFixed(2)
}

export function formatNumber(num) {
  // 格式化数字，添加千分位
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
```

## 注意事项

1. **权限控制**：统计功能应该只对管理员开放，需要在云函数中添加权限验证
2. **数据缓存**：对于不经常变化的历史数据，可以在小程序端缓存，减少云函数调用
3. **加载状态**：查询统计数据可能需要较长时间，应该显示加载状态
4. **错误处理**：网络错误或数据异常时，应该给用户友好的提示
5. **金额单位**：云函数返回的金额单位是"分"，显示时需要转换为"元"
6. **日期时区**：确保日期时间使用统一的时区，避免统计偏差
7. **性能优化**：大数据量查询时可能较慢，考虑使用定时任务预先计算统计数据
