# 组件说明

## 组件列表

### 1. product-card（商品卡片）
用于商品列表展示的卡片组件

**属性：**
- product: Object - 商品信息
- showCart: Boolean - 是否显示加入购物车按钮

**事件：**
- onTap: 点击商品卡片
- onAddCart: 点击加入购物车

### 2. order-item（订单项）
用于订单列表展示的订单项组件

**属性：**
- order: Object - 订单信息

**事件：**
- onTap: 点击订单
- onPay: 点击支付
- onCancel: 点击取消
- onConfirm: 点击确认收货
- onReview: 点击评价

### 3. address-card（地址卡片）
用于地址列表展示的地址卡片组件

**属性：**
- address: Object - 地址信息
- showActions: Boolean - 是否显示操作按钮

**事件：**
- onTap: 点击地址
- onEdit: 点击编辑
- onDelete: 点击删除
- onSetDefault: 设置为默认地址

### 4. coupon-card（优惠券卡片）
用于优惠券展示的卡片组件

**属性：**
- coupon: Object - 优惠券信息
- status: String - 状态（available/used/expired）

**事件：**
- onClaim: 点击领取
- onUse: 点击使用

### 5. tab-bar（底部导航栏）
自定义底部导航栏组件（如需自定义样式）

**属性：**
- current: Number - 当前选中的tab索引

**事件：**
- onChange: tab切换事件

## 组件开发规范

1. 组件命名使用kebab-case
2. 组件目录包含4个文件：.wxml, .wxss, .js, .json
3. 组件样式使用BEM命名规范
4. 组件属性使用properties定义
5. 组件事件使用triggerEvent触发
6. 组件需要编写详细的注释说明

## 示例

```javascript
// components/product-card/product-card.js
Component({
  properties: {
    product: {
      type: Object,
      value: {}
    },
    showCart: {
      type: Boolean,
      value: true
    }
  },
  
  methods: {
    onTap() {
      this.triggerEvent('tap', { product: this.data.product })
    },
    
    onAddCart(e) {
      e.stopPropagation()
      this.triggerEvent('addcart', { product: this.data.product })
    }
  }
})
```
