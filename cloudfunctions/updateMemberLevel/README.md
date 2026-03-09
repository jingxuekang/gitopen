# 会员等级管理云函数

## 功能说明

该云函数用于检查并更新用户的会员等级。根据用户的累计消费金额自动升级会员等级。

## 会员等级规则

| 等级 | 名称 | 消费门槛 |
|------|------|----------|
| 0 | 普通会员 | ¥0 |
| 1 | 银卡会员 | ¥1,000 |
| 2 | 金卡会员 | ¥5,000 |

## 会员权益

### 普通会员
- 正常价格购买
- 积分累积

### 银卡会员
- 9.5折优惠
- 专属优惠券
- 优先客服

### 金卡会员
- 9折优惠
- 专属优惠券
- 优先客服
- 生日礼包

## 调用方式

### 输入参数

```javascript
{
  userId: String  // 用户的openid
}
```

### 返回结果

#### 等级未变化
```javascript
{
  code: 0,
  message: '会员等级未变化',
  data: {
    upgraded: false,
    currentLevel: 1,
    levelName: '银卡会员',
    totalSpent: 150000
  }
}
```

#### 等级升级
```javascript
{
  code: 0,
  message: '会员等级更新成功',
  data: {
    upgraded: true,
    oldLevel: 0,
    newLevel: 1,
    oldLevelName: '普通会员',
    newLevelName: '银卡会员',
    totalSpent: 100000
  }
}
```

## 触发时机

1. **订单支付成功后**：在 `paymentNotify` 云函数中，订单支付成功并更新用户累计消费后，自动调用此函数检查会员等级
2. **手动触发**：管理员可以手动调用此函数更新用户会员等级

## 升级通知

当用户会员等级升级时，系统会自动发送微信订阅消息通知用户。需要在微信公众平台配置订阅消息模板。

### 模板配置

模板ID: `YOUR_MEMBER_UPGRADE_TEMPLATE_ID`

模板内容示例：
```
会员升级通知
{{thing1.DATA}}
新等级：{{thing2.DATA}}
升级时间：{{date3.DATA}}
```

## 集成说明

### 在支付回调中集成

在 `paymentNotify` 云函数中，支付成功并更新用户累计消费后：

```javascript
// 检查并更新会员等级
try {
  const memberLevelResult = await cloud.callFunction({
    name: 'updateMemberLevel',
    data: {
      userId: order.userId
    }
  })
  
  if (memberLevelResult.result.code === 0 && memberLevelResult.result.data.upgraded) {
    console.log('会员等级已升级:', memberLevelResult.result.data)
  }
} catch (memberError) {
  console.error('更新会员等级失败:', memberError)
  // 会员等级更新失败不影响支付流程
}
```

## 前端展示

### 个人中心页面

在个人中心页面 (`pages/user/user`) 显示：

1. **会员等级徽章**：显示当前会员等级
2. **升级进度条**：显示距离下一等级还需消费的金额和进度
3. **会员权益列表**：显示当前等级享有的权益

### 商品价格显示

在商品列表和详情页，根据用户会员等级显示会员价格：
- 银卡会员：原价 × 0.95
- 金卡会员：原价 × 0.9

## 测试建议

1. 测试普通会员升级到银卡会员（消费满1000元）
2. 测试银卡会员升级到金卡会员（消费满5000元）
3. 测试已是最高等级时不再升级
4. 测试升级通知是否正常发送
5. 测试会员权益在个人中心正确显示

## 注意事项

1. 会员等级只能升级，不能降级
2. 累计消费金额包含所有已支付订单的实付金额
3. 会员等级更新失败不影响支付流程
4. 升级通知发送失败不影响等级更新
5. 需要在微信公众平台配置订阅消息模板才能发送通知
