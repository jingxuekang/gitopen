# 部署指南（现阶段）

## 1. 部署范围说明

当前仅包含可独立上线能力：

- 商品、购物车、订单、地址、收藏、评价、优惠券、拼团
- 模拟支付流程（不含真实商户对接）

以下能力为后续对接项（本阶段不阻塞上线测试）：

- 微信支付商户号与证书
- 物流第三方接口
- 模板消息/短信服务

## 2. 上传前检查

1. `project.config.json`
   - `minified: true`
   - `minifyWXSS: true`
   - `minifyWXML: true`
   - `packOptions.ignore` 排除了 `docs/`、`tests/`、`scripts/`、`node_modules/`
2. `app.json`
   - `lazyCodeLoading: "requiredComponents"`
3. 图片资源已压缩（避免单图体积过大）

## 3. 云环境准备

1. 在微信开发者工具绑定正确云环境
2. 确认数据库集合存在：
   - `users`
   - `products`
   - `orders`
   - `cart_items`
   - `favorites`
   - `addresses`
   - `reviews`
   - `coupons`

## 4. 云函数部署顺序（建议）

1. 基础函数：`login`、`getUserInfo`、`getUserProfile`
2. 商品函数：`getHomeData`、`getProducts`、`getProductDetail`
3. 交易函数：`getCart`、`addToCart`、`createOrder`、`createPayment`
4. 辅助函数：收藏、优惠券、拼团、评价
5. 定时函数：`checkExpiredOrders`、`checkExpiredGroups`

## 5. 上传步骤

1. 开发者工具执行“清缓存并编译”
2. 右上角“上传”
3. 上传备注写明版本与本次改动摘要
4. 在体验版验证：
   - 首页加载
   - 商品详情加购/立即购买
   - 购物车增减数量
   - 下单与地址回填
   - 收藏与取消收藏

## 6. 常见报错定位

### `collection not exists`
- 缺少数据库集合，先创建对应集合

### `FunctionName not exists`
- 云函数未部署或环境错误，重新部署并检查环境 ID

### 支付失败
- 现阶段仅支持模拟支付；真实支付需商户参数完成后再开通
