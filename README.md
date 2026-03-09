# 茶叶商城微信小程序

茶叶、陈皮、紫砂壶电商小程序，基于微信云开发实现。

## 当前能力

- 用户登录与资料管理
- 商品首页/列表/详情/搜索
- 收藏、购物车、地址管理
- 下单、订单管理、模拟支付
- 评价、优惠券、拼团

## 技术栈

- 前端：微信小程序原生（WXML / WXSS / JS）
- 后端：微信云函数（Node.js）
- 数据：微信云数据库

## 目录结构

```text
app.js
app.json
app.wxss
pages/
components/
utils/
cloudfunctions/
images/
docs/
scripts/
tests/
```

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 微信开发者工具导入项目根目录 `d:\workspace\weChatShop`

3. 配置云环境 ID（`app.js` 中 `wx.cloud.init`）

4. 部署云函数（`cloudfunctions/` 下各函数）

5. 运行检查

```bash
npm run lint
npm run test
```

## 上传优化（已启用）

- `project.config.json` 启用代码压缩
- `app.json` 启用 `lazyCodeLoading: "requiredComponents"`
- 上传忽略 `docs/`、`tests/`、`scripts/`、`node_modules/`

## 文档索引

- [部署指南](docs/deployment/DEPLOYMENT.md)
- [开发指南](docs/guides/DEVELOPMENT.md)
- [云函数 API](docs/api/README.md)
- [功能文档](docs/features)

## 后续对接项（当前未启用）

- 微信真实支付（商户号、证书、退款）
- 第三方物流查询
- 模板消息/短信服务
