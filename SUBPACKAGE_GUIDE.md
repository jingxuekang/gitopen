# 小程序分包配置说明

## 分包结构

```
主包 (< 2MB)
├── pages/index/index          # 首页
├── pages/category/category    # 分类页
├── pages/cart/cart            # 购物车
├── pages/user/user            # 个人中心
├── pages/login/login          # 登录页
└── pages/search/search        # 搜索页

packageProduct (商品分包)
├── pages/product/product      # 商品详情
├── pages/trace/source/source  # 产品溯源
├── pages/review/review        # 发表评价
└── pages/review/list/list     # 评价列表

packageOrder (订单分包)
├── pages/order/confirm/confirm  # 订单确认
├── pages/order/list/list        # 订单列表
├── pages/order/detail/detail    # 订单详情
└── pages/payment/payment        # 支付页

packageUser (用户分包)
├── pages/user/settings/settings        # 设置
├── pages/user/address/list/list        # 地址列表
├── pages/user/address/edit/edit        # 编辑地址
├── pages/user/coupon/coupon            # 我的优惠券
└── pages/user/favorite/favorite        # 我的收藏

packageOther (其他分包)
├── pages/group/list/list              # 拼团列表
├── pages/group/detail/detail          # 拼团详情
├── pages/coupon/center/center         # 领券中心
├── pages/coupon/select/select         # 选择优惠券
└── pages/customer-service/customer-service  # 客服
```

## 分包大小限制

- 主包：≤ 2MB
- 单个分包：≤ 2MB
- 所有分包总和：≤ 20MB

## 预加载配置

已配置预加载规则：
- 首页 → 预加载商品分包
- 分类页 → 预加载商品分包
- 购物车 → 预加载订单分包

## 路径更新说明

所有跳转路径已自动更新为分包路径：
- `/pages/product/product` → `/packageProduct/pages/product/product`
- `/pages/order/confirm/confirm` → `/packageOrder/pages/order/confirm/confirm`
- 其他页面类推

## 注意事项

1. **独立分包**：如需独立分包，在 app.json 中设置 `"independent": true`
2. **分包异步化**：已启用 `lazyCodeLoading: "requiredComponents"`
3. **图片资源**：大图必须使用云存储，不要放在代码包中
4. **公共资源**：utils、components 等公共代码会被打包到主包
