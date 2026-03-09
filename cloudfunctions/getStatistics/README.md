# getStatistics 云函数

## 功能说明

获取运营数据统计，支持多种统计类型：
- 每日统计（订单数量、销售额、新增用户）
- 商品统计（浏览量、加购量、销售量）
- 热销商品排行榜
- 用户地域分布统计
- 综合统计数据

## 接口参数

### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | String | 是 | 统计类型：daily/product/hotProducts/userRegion/overview |
| startDate | String | 否 | 开始日期（ISO格式），默认为当天0点 |
| endDate | String | 否 | 结束日期（ISO格式），默认为当前时间 |

### 统计类型说明

#### 1. daily - 每日统计
返回指定日期范围内的订单数量、销售额和新增用户数。

**请求示例：**
```javascript
{
  type: 'daily',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z'
}
```

**返回数据：**
```javascript
{
  success: true,
  data: {
    orderCount: 150,        // 订单数量
    totalSales: 45000,      // 销售额（分）
    newUserCount: 30,       // 新增用户数
    startDate: Date,
    endDate: Date
  }
}
```

#### 2. product - 商品统计
返回所有商品的浏览量、加购量、销售量等数据。

**请求示例：**
```javascript
{
  type: 'product',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z'
}
```

**返回数据：**
```javascript
{
  success: true,
  data: {
    products: [
      {
        productId: 'xxx',
        productName: '西湖龙井',
        productImage: 'https://...',
        viewCount: 500,         // 浏览量
        addToCartCount: 80,     // 加购量
        salesCount: 50,         // 销售量
        currentStock: 200,      // 当前库存
        totalSales: 150         // 累计销量
      }
    ],
    startDate: Date,
    endDate: Date
  }
}
```

#### 3. hotProducts - 热销商品排行榜
返回指定时间范围内的热销商品排行（按销售量排序，前20名）。

**请求示例：**
```javascript
{
  type: 'hotProducts',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z'
}
```

**返回数据：**
```javascript
{
  success: true,
  data: {
    hotProducts: [
      {
        productId: 'xxx',
        productName: '西湖龙井',
        productImage: 'https://...',
        salesCount: 150,        // 销售数量
        salesAmount: 45000      // 销售额（分）
      }
    ],
    startDate: Date,
    endDate: Date
  }
}
```

#### 4. userRegion - 用户地域分布统计
返回用户的省份和城市分布统计（基于订单收货地址）。

**请求示例：**
```javascript
{
  type: 'userRegion'
}
```

**返回数据：**
```javascript
{
  success: true,
  data: {
    provinceStats: [
      {
        province: '浙江省',
        orderCount: 200,        // 订单数量
        userCount: 50,          // 用户数量
        salesAmount: 60000      // 销售额（分）
      }
    ],
    cityStats: [
      {
        province: '浙江省',
        city: '杭州市',
        orderCount: 150,
        userCount: 40,
        salesAmount: 45000
      }
    ]
  }
}
```

#### 5. overview - 综合统计
返回综合统计数据，包含每日统计、热销商品、地域分布和总体数据。

**请求示例：**
```javascript
{
  type: 'overview',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z'
}
```

**返回数据：**
```javascript
{
  success: true,
  data: {
    daily: {
      orderCount: 150,
      totalSales: 45000,
      newUserCount: 30
    },
    hotProducts: [...],      // 前10名热销商品
    region: {
      topProvinces: [...],   // 前10个省份
      topCities: [...]       // 前10个城市
    },
    totals: {
      totalUsers: 500,       // 总用户数
      totalProducts: 100,    // 总商品数
      totalOrders: 1000      // 总订单数
    },
    startDate: Date,
    endDate: Date
  }
}
```

## 错误处理

**错误响应格式：**
```javascript
{
  success: false,
  message: '错误信息',
  error: '详细错误'
}
```

**常见错误：**
- 无效的统计类型
- 数据库查询失败
- 日期格式错误

## 使用示例

### 小程序端调用

```javascript
// 获取今日统计
wx.cloud.callFunction({
  name: 'getStatistics',
  data: {
    type: 'daily',
    startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    endDate: new Date().toISOString()
  }
}).then(res => {
  console.log('今日统计:', res.result.data)
})

// 获取热销商品排行榜（最近30天）
const endDate = new Date()
const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

wx.cloud.callFunction({
  name: 'getStatistics',
  data: {
    type: 'hotProducts',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
}).then(res => {
  console.log('热销商品:', res.result.data.hotProducts)
})

// 获取用户地域分布
wx.cloud.callFunction({
  name: 'getStatistics',
  data: {
    type: 'userRegion'
  }
}).then(res => {
  console.log('省份分布:', res.result.data.provinceStats)
  console.log('城市分布:', res.result.data.cityStats)
})

// 获取综合统计
wx.cloud.callFunction({
  name: 'getStatistics',
  data: {
    type: 'overview',
    startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    endDate: new Date().toISOString()
  }
}).then(res => {
  console.log('综合统计:', res.result.data)
})
```

## 性能优化建议

1. **缓存策略**：对于不经常变化的统计数据（如历史数据），可以在小程序端缓存
2. **分页查询**：对于大量数据，建议使用分页查询
3. **定时任务**：可以创建定时任务预先计算统计数据并存储，提高查询速度
4. **索引优化**：确保数据库集合有适当的索引：
   - orders: paymentStatus, paymentTime, userId
   - users: createdAt
   - cart_items: productId, createdAt
   - product_views: productId, createdAt

## 数据库依赖

该云函数依赖以下数据库集合：
- `orders` - 订单表
- `users` - 用户表
- `products` - 商品表
- `cart_items` - 购物车表（可选）
- `product_views` - 商品浏览记录表（可选）

## 验证需求

该云函数实现了以下需求：
- **需求 20.1**：统计每日的订单数量、销售额和新增用户数
- **需求 20.2**：统计商品的浏览量、加购量和销售量
- **需求 20.3**：提供数据报表页面，支持按日期范围查询
- **需求 20.4**：显示热销商品排行榜
- **需求 20.5**：显示用户地域分布统计

## 注意事项

1. 该云函数主要用于管理后台，建议添加管理员权限验证
2. 商品浏览量统计需要配合前端埋点记录到 `product_views` 表
3. 所有金额单位为"分"，前端显示时需要除以100
4. 地域统计基于订单收货地址，只统计已支付订单
5. 热销商品排行榜按销售数量排序，可根据需要调整为按销售额排序
