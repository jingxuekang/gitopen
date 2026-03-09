# 拼团功能云函数说明

## 概述

拼团功能允许用户以更低的价格购买商品，通过多人组团的方式达成交易。本文档说明拼团相关云函数的使用方法和业务流程。

## 业务流程

### 1. 发起拼团流程

```
用户浏览拼团活动 → 选择商品规格 → 创建订单并支付 → 调用createGroup发起拼团 → 分享给好友
```

**关键点：**
- 用户必须先创建订单并完成支付
- 一个用户在同一拼团活动中只能发起或参与一次
- 发起拼团时会扣减拼团活动库存

### 2. 参与拼团流程

```
用户通过分享链接进入 → 查看拼团详情 → 创建订单并支付 → 调用joinGroup参与拼团 → 等待成团
```

**关键点：**
- 用户必须先创建订单并完成支付
- 验证拼团是否过期、是否已满员
- 参团成功后检查是否达到成团人数
- 如果成团，自动通知所有成员

### 3. 拼团成功

```
最后一人参团 → 拼团状态更新为成功 → 发送通知给所有成员 → 商家发货
```

### 4. 拼团失败（超时）

```
定时任务检查过期拼团 → 更新拼团状态为失败 → 退款给所有成员 → 恢复库存和优惠券
```

## 云函数说明

### createGroup - 发起拼团

**功能：** 用户发起一个新的拼团

**参数：**
```javascript
{
  activityId: String,  // 拼团活动ID（必填）
  orderId: String      // 订单ID（必填，订单必须已支付）
}
```

**返回：**
```javascript
{
  success: Boolean,
  message: String,
  data: {
    groupId: String,   // 拼团ID
    group: Object      // 拼团详情
  }
}
```

**业务逻辑：**
1. 验证拼团活动是否有效（状态、时间、库存）
2. 验证订单是否存在且已支付
3. 检查用户是否已参与该活动的其他拼团
4. 创建拼团记录（团长为当前用户）
5. 更新订单的拼团信息
6. 扣减拼团活动库存

**错误处理：**
- 活动不存在或已结束
- 活动库存不足
- 订单不存在或未支付
- 用户已参与该活动的拼团

### joinGroup - 参与拼团

**功能：** 用户参与一个已存在的拼团

**参数：**
```javascript
{
  groupId: String,     // 拼团ID（必填）
  orderId: String      // 订单ID（必填，订单必须已支付）
}
```

**返回：**
```javascript
{
  success: Boolean,
  message: String,
  data: {
    groupId: String,
    currentCount: Number,  // 当前人数
    isComplete: Boolean    // 是否成团
  }
}
```

**业务逻辑：**
1. 验证拼团是否存在且状态为进行中
2. 验证拼团是否过期或已满员
3. 验证用户是否已参团
4. 验证订单是否存在且已支付
5. 验证拼团活动库存
6. 添加用户到拼团成员列表
7. 更新订单的拼团信息
8. 扣减拼团活动库存
9. 如果达到成团人数，更新拼团状态为成功并发送通知

**错误处理：**
- 拼团不存在或已结束
- 拼团已过期或已满员
- 用户已参团
- 订单不存在或未支付
- 活动库存不足

### checkExpiredGroups - 检查过期拼团

**功能：** 定时检查并处理过期的拼团（云函数定时触发器）

**触发器配置：**
- 类型：timer
- 频率：每5分钟执行一次
- Cron表达式：`0 */5 * * * * *`

**参数：** 无（由定时触发器自动调用）

**返回：**
```javascript
{
  success: Boolean,
  message: String,
  data: {
    totalCount: Number,    // 处理的拼团总数
    successCount: Number,  // 成功处理的数量
    failCount: Number      // 失败处理的数量
  }
}
```

**业务逻辑：**
1. 查询所有过期且状态为"拼团中"的记录
2. 对每个过期拼团：
   - 更新拼团状态为失败
   - 恢复拼团活动库存
   - 处理所有参团订单：
     - 更新订单状态为已取消
     - 恢复商品库存
     - 退还优惠券（如果使用了）
     - 调用微信支付退款接口（TODO）
     - 发送退款通知给用户（TODO）

**注意事项：**
- 需要在云函数配置中添加定时触发器
- 退款功能需要配置微信支付商户号和密钥
- 建议添加错误日志和监控告警

### getGroupActivities - 获取拼团活动列表

**功能：** 获取进行中的拼团活动列表（已实现）

**参数：**
```javascript
{
  page: Number,      // 页码（可选，默认1）
  pageSize: Number   // 每页数量（可选，默认10）
}
```

### getGroupDetail - 获取拼团详情

**功能：** 获取指定拼团的详细信息（已实现）

**参数：**
```javascript
{
  groupId: String    // 拼团ID（必填）
}
```

## 数据库集合

### group_activities - 拼团活动表

```javascript
{
  _id: ObjectId,
  productId: ObjectId,      // 商品ID
  groupPrice: Number,       // 拼团价格（分）
  originalPrice: Number,    // 原价（分）
  requiredCount: Number,    // 成团人数
  duration: Number,         // 拼团时长（小时）
  stock: Number,            // 拼团库存
  validFrom: Date,          // 活动开始时间
  validTo: Date,            // 活动结束时间
  status: Number,           // 状态 0-未开始 1-进行中 2-已结束
  createdAt: Date,
  updatedAt: Date
}
```

### groups - 拼团记录表

```javascript
{
  _id: ObjectId,
  activityId: ObjectId,     // 拼团活动ID
  leaderId: String,         // 团长用户ID（openid）
  status: Number,           // 状态 0-拼团中 1-拼团成功 2-拼团失败
  currentCount: Number,     // 当前人数
  requiredCount: Number,    // 成团人数
  members: [{               // 成员列表
    userId: String,         // 用户ID（openid）
    orderId: String,        // 订单ID
    joinedAt: Date          // 参团时间
  }],
  expireAt: Date,           // 过期时间
  createdAt: Date,
  updatedAt: Date
}
```

## 前端集成示例

### 1. 发起拼团

```javascript
// 在商品详情页或拼团活动页
async onCreateGroup() {
  try {
    // 1. 先创建订单并支付
    const orderResult = await wx.cloud.callFunction({
      name: 'createOrder',
      data: { /* 订单数据 */ }
    })
    
    const orderId = orderResult.result.data.orderId
    
    // 2. 调用支付
    const payResult = await wx.cloud.callFunction({
      name: 'createPayment',
      data: { orderId }
    })
    
    // 3. 支付成功后发起拼团
    const groupResult = await wx.cloud.callFunction({
      name: 'createGroup',
      data: {
        activityId: this.data.activityId,
        orderId: orderId
      }
    })
    
    if (groupResult.result.success) {
      // 跳转到拼团详情页
      wx.redirectTo({
        url: `/pages/group/detail/detail?groupId=${groupResult.result.data.groupId}`
      })
    }
  } catch (error) {
    console.error('发起拼团失败:', error)
  }
}
```

### 2. 参与拼团

```javascript
// 在拼团详情页
async onJoinGroup() {
  try {
    // 1. 先创建订单并支付
    const orderResult = await wx.cloud.callFunction({
      name: 'createOrder',
      data: { /* 订单数据 */ }
    })
    
    const orderId = orderResult.result.data.orderId
    
    // 2. 调用支付
    const payResult = await wx.cloud.callFunction({
      name: 'createPayment',
      data: { orderId }
    })
    
    // 3. 支付成功后参与拼团
    const joinResult = await wx.cloud.callFunction({
      name: 'joinGroup',
      data: {
        groupId: this.data.groupId,
        orderId: orderId
      }
    })
    
    if (joinResult.result.success) {
      if (joinResult.result.data.isComplete) {
        wx.showToast({
          title: '拼团成功！',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '参团成功',
          icon: 'success'
        })
      }
      // 刷新页面
      this.loadGroupDetail()
    }
  } catch (error) {
    console.error('参团失败:', error)
  }
}
```

### 3. 显示拼团进度

```javascript
// 在拼团详情页
Page({
  data: {
    group: null,
    timeLeft: '',
    progressPercent: 0
  },
  
  onLoad(options) {
    this.loadGroupDetail()
    this.startCountdown()
  },
  
  // 加载拼团详情
  async loadGroupDetail() {
    const result = await wx.cloud.callFunction({
      name: 'getGroupDetail',
      data: { groupId: this.data.groupId }
    })
    
    if (result.result.success) {
      const group = result.result.data.group
      const progressPercent = (group.currentCount / group.requiredCount) * 100
      
      this.setData({
        group,
        progressPercent
      })
    }
  },
  
  // 启动倒计时
  startCountdown() {
    const updateTime = () => {
      const now = new Date().getTime()
      const expireTime = new Date(this.data.group.expireAt).getTime()
      const diff = expireTime - now
      
      if (diff <= 0) {
        this.setData({ timeLeft: '已过期' })
        clearInterval(this.timer)
        return
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      this.setData({
        timeLeft: `${hours}小时${minutes}分${seconds}秒`
      })
    }
    
    updateTime()
    this.timer = setInterval(updateTime, 1000)
  }
})
```

## 部署步骤

1. **上传云函数**
   ```bash
   # 在微信开发者工具中，右键点击云函数目录
   # 选择"上传并部署：云端安装依赖"
   ```

2. **配置定时触发器**
   - 在云开发控制台中找到 `checkExpiredGroups` 云函数
   - 点击"触发器"标签
   - 添加定时触发器，Cron表达式：`0 */5 * * * * *`

3. **配置微信支付退款**（TODO）
   - 在云函数中配置微信支付商户号和密钥
   - 实现退款接口调用逻辑

4. **配置模板消息**（TODO）
   - 在微信公众平台配置模板消息
   - 实现拼团成功和退款通知

## 测试建议

1. **单元测试**
   - 测试发起拼团的各种边界情况
   - 测试参与拼团的验证逻辑
   - 测试拼团成功的判断逻辑

2. **集成测试**
   - 测试完整的拼团流程
   - 测试拼团超时处理
   - 测试并发参团场景

3. **压力测试**
   - 测试高并发参团场景
   - 测试库存扣减的准确性

## 注意事项

1. **库存一致性**
   - 使用数据库事务确保库存扣减的原子性
   - 拼团失败时正确恢复库存

2. **并发控制**
   - 使用乐观锁或悲观锁防止超卖
   - 处理并发参团的竞态条件

3. **退款处理**
   - 确保退款接口的幂等性
   - 记录退款日志便于对账

4. **性能优化**
   - 对频繁查询的字段添加索引
   - 使用缓存减少数据库查询

5. **监控告警**
   - 监控拼团成功率
   - 监控退款失败情况
   - 设置异常告警

## 相关需求

- 需求 14.1：商品支持拼团
- 需求 14.2：用户发起拼团
- 需求 14.3：其他用户参团
- 需求 14.4：拼团成功判断和通知
- 需求 14.5：拼团失败退款
- 需求 14.6：显示拼团进度
- 需求 14.7：查看拼团列表
