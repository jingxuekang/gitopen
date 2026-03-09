# 小程序质量整改 Skills Playbook

更新时间：2026-03-06  
适用仓库：`D:/workspace/weChatShop`

## 本轮新增自动审计能力

已新增脚本：`scripts/audit-integrity.js`

执行命令：

```bash
node scripts/audit-integrity.js
```

当前输出（摘要）：

- 未注册页面：`pages/group/detail/detail`、`pages/group/list/list`
- 页面跳转到未注册路由：`pages/index/index.js:448 -> /pages/group/list/list`
- 调用了不存在的云函数：`clearCart`、`confirmOrder`、`getPaymentStatus`

## Skills 总览（按优先级）

| Priority | Skill | 目标 |
| --- | --- | --- |
| P0 | skill-auth-openid-unification | 统一身份体系，杜绝串号与伪登录 |
| P0 | skill-order-pricing-authority | 订单金额完全由服务端重算，前端不可篡改 |
| P0 | skill-admin-rbac-guard | 敏感云函数必须管理员鉴权 |
| P0 | skill-payment-notify-verification | 支付回调来源与签名校验 |
| P1 | skill-api-contract-unification | 前后端返回协议统一（`code`/`success`） |
| P1 | skill-coupon-contract-repair | 优惠券 ID 语义与下单流程修复 |
| P1 | skill-group-order-binding | 拼团参数与订单绑定补全 |
| P1 | skill-route-navigation-integrity | 页面注册与跳转路径一致 |
| P1 | skill-search-input-safety | 搜索关键字正则转义与异常兜底 |
| P1 | skill-test-stability-rebuild | 修复测试基线，恢复可持续 CI |

## Skill 卡片

## skill-auth-openid-unification（P0）

问题证据：

- `pages/login/login.js:214` 直接按手机号查/建用户，未绑定 `openid`
- `pages/login/login.js:315` 微信登录只拿 `users` 第一条记录，存在串号
- `cloudfunctions/login/index.js:23` 已有按 `openid` 登录能力但前端未统一走该链路

实施动作：

1. 前端登录统一走 `cloudfunctions/login`，禁止页面层直接写 `users`。
2. `users` 建唯一索引策略（`openid` 唯一，手机号可为空但不可复用冲突）。
3. 本地 `storage` 中只缓存必要字段，敏感身份以云端 `OPENID` 为准。
4. 迁移历史“无 openid 用户”数据，建立一次性对齐脚本。

验收标准：

- 同设备切号、同账号换设备不会串号。
- 任意页面刷新后身份一致且可追溯 `openid`。
- 登录链路全量无 `db.collection('users').add/get` 的页面直写。

## skill-order-pricing-authority（P0）

问题证据：

- `cloudfunctions/createOrder/index.js:88` 接收前端 `totalAmount/memberDiscount/discountAmount/payAmount`
- `cloudfunctions/createOrder/index.js:216` 直接写入订单，未进行服务端重算比对
- `pages/order/confirm/confirm.js:467` 前端提交可控金额字段

实施动作：

1. `createOrder` 仅接收 `items/address/couponToken/remark`，不接收最终金额。
2. 服务端按商品实时价格、会员等级、优惠券规则重算金额并落库。
3. 将“提交金额”和“服务端重算金额”差异记审计日志并拒单。
4. 补一组防篡改单测与集成测试（价格、数量、优惠券叠加）。

验收标准：

- 抓包篡改 `payAmount` 无法生效。
- 订单金额与服务端重算结果完全一致。
- 异常订单有审计日志可追溯。

## skill-admin-rbac-guard（P0）

问题证据：

- `cloudfunctions/updateStock/index.js:14` 无管理员校验
- `cloudfunctions/updateLogistics/index.js:10` 无管理员校验
- `cloudfunctions/getStatistics/index.js:11` 无管理员校验

实施动作：

1. 建立统一 `requireAdmin(context)` 中间层（白名单 OPENID/角色表）。
2. 所有后台函数入口第一行执行鉴权，失败立即返回。
3. 加入操作审计字段：`operatorOpenid/action/targetId/timestamp`。
4. 管理端 API 与用户端 API 分离命名，避免误调用。

验收标准：

- 普通用户调用敏感函数均返回 `403`。
- 管理员操作均可查到审计记录。

## skill-payment-notify-verification（P0）

问题证据：

- `cloudfunctions/paymentNotify/index.js:14` 仅信任 `event` 字段，缺少签名/来源校验

实施动作：

1. 接入微信支付回调验签流程（平台证书/签名串校验）。
2. 加幂等键（`outTradeNo + transactionId`）避免重复通知二次处理。
3. 支付金额与订单待付金额二次核对，不一致拒绝入账。
4. 回调异常告警（日志 + 指标）。

验收标准：

- 伪造请求不能改变订单状态。
- 重复回调不会重复记账。

## skill-api-contract-unification（P1）

问题证据：

- `utils/api.js:433` 通用封装以 `res.result.code === 0` 判成功
- `cloudfunctions/getCoupons/index.js:26`、`getAvailableCoupons/index.js:102`、`claimCoupon/index.js:101` 返回 `success: true` 风格

实施动作：

1. 统一协议为 `{ code, message, data }`，`code===0` 成功。
2. 兼容期内在 `utils/api.js` 做双协议适配，逐步迁移云函数。
3. 为每个云函数建立契约快照测试，避免回归。

验收标准：

- 前端不再因 `success/code` 混用导致误判失败。
- 所有云函数返回结构可由一套解析逻辑覆盖。

## skill-coupon-contract-repair（P1）

问题证据：

- `pages/order/confirm/confirm.js:327` 选券后仅保留 `coupon.couponInfo`
- `pages/order/confirm/confirm.js:471` 提交时 `couponId` 取 `selectedCoupon._id`
- `cloudfunctions/createOrder/index.js:178` 校验的是 `user_coupons._id`（语义不一致）

实施动作：

1. 下单提交字段改为 `userCouponId`（用户券实例 ID）。
2. `selectedCoupon` 保留完整对象：`{ _id(userCouponId), couponId, couponInfo }`。
3. `createOrder` 只接受 `userCouponId`，内部关联 `couponInfo` 计算优惠。
4. 增加“选券成功下单”回归测试。

验收标准：

- 选择优惠券后可稳定下单并正确核销。
- 不再出现“前端选中但服务端判不可用”。

## skill-group-order-binding（P1）

问题证据：

- `pages/group/detail/detail.js:181` 创建拼团未传 `orderId`
- `cloudfunctions/createGroup/index.js:12` 强依赖 `orderId`
- `pages/group/detail/detail.js:223` 参团也未传 `orderId`
- `cloudfunctions/joinGroup/index.js:12` 同样要求 `orderId`

实施动作：

1. 明确业务流程：先支付订单后发起/参团，或先锁单后支付。
2. 前端参数补齐 `orderId`，并做状态校验（已支付才可拼团）。
3. 云函数对订单归属、活动有效期、库存做完整校验并返回错误码。

验收标准：

- 发起拼团与参团流程可端到端成功。
- 错误场景（未支付、非本人订单）有准确错误提示。

## skill-route-navigation-integrity（P1）

问题证据：

- `app.json` 未注册 `pages/group/list/list` 与 `pages/group/detail/detail`
- `pages/index/index.js:448` 跳转到未注册页
- `pages/product/product.js:985` 跳转 `/pages/review/list/list`（页面不存在）
- `scripts/audit-integrity.js` 自动审计可稳定复现

实施动作：

1. 补齐 `app.json` 页面注册，或删除死链入口。
2. 修正 `viewMoreReviews` 跳转到真实可用页面。
3. 将 `node scripts/audit-integrity.js` 加入 CI 前置检查。

验收标准：

- 全站导航无 `page not found`。
- 审计脚本在 CI 中结果为 0 异常。

## skill-search-input-safety（P1）

问题证据：

- `cloudfunctions/searchProducts/index.js:22` 直接 `new RegExp(keyword, 'i')`

实施动作：

1. 对关键字做正则转义（`escapeRegExp`）。
2. 限制关键词长度与非法字符。
3. 正则构造失败时降级为空结果，不抛 500。

验收标准：

- 特殊字符输入不会导致函数崩溃。
- 属性测试（fuzz）可稳定通过。

## skill-test-stability-rebuild（P1）

问题证据：

- 全量 `npm test` 目前不稳定（超时）
- 已知失败点：`searchProducts`、`getStatistics`（`wx-server-sdk` mock 缺失）、`addAddress`（超时）

实施动作：

1. 分层修复测试：先单函数、再模块、最后全量。
2. 统一 `wx-server-sdk` mock 与测试超时配置。
3. 为高风险链路补测试：登录、下单金额、防越权、支付回调。
4. 建立“最小可通过集”作为合并门槛。

验收标准：

- CI 中 `npm test` 稳定通过。
- 关键 P0 场景均有自动化覆盖。

## 建议执行顺序（两阶段）

阶段 1（先止血，1-2 天）：

1. `skill-auth-openid-unification`
2. `skill-order-pricing-authority`
3. `skill-admin-rbac-guard`
4. `skill-payment-notify-verification`

阶段 2（修契约与可维护性，2-4 天）：

1. `skill-api-contract-unification`
2. `skill-coupon-contract-repair`
3. `skill-group-order-binding`
4. `skill-route-navigation-integrity`
5. `skill-search-input-safety`
6. `skill-test-stability-rebuild`

