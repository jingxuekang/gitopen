# 开发指南

## 1. 环境准备

1. 安装 Node.js 18+（推荐 LTS）
2. 安装微信开发者工具（稳定版）
3. 开通云开发环境并记录环境 ID

## 2. 项目结构（当前）

```text
app.js / app.json / app.wxss
pages/                页面
components/           组件
utils/                API、缓存、错误处理等工具
cloudfunctions/       云函数
docs/                 文档
scripts/              辅助脚本
```

## 3. 常用命令

```bash
npm install
npm run lint
npm run lint:fix
npm run format
npm run test
```

## 4. 代码规范

- 2 空格缩进
- 单引号
- 不使用分号
- 页面中统一使用 `utils/api.js` 调云函数
- 统一错误处理：`handleError(error, { context: 'xxx' })`

## 5. 缓存与请求规范

- 首页数据使用 `utils/cache.js`，默认 5 分钟过期
- `utils/api.js` 对 `get*` 请求启用去重，避免重复请求
- 修改类请求（add/update/delete）不做去重

## 6. 新增组件建议

组件命名用 `kebab-case`，目录结构统一：

```text
components/xxx-card/
  xxx-card.js
  xxx-card.json
  xxx-card.wxml
  xxx-card.wxss
```

事件约定：

- `tap`：点击卡片
- `action`：操作按钮回调
- 参数通过 `detail` 返回，避免依赖全局状态

## 7. 常见问题

### `DATABASE_COLLECTION_NOT_EXIST`
- 原因：云数据库集合未创建或环境不一致
- 处理：在云开发控制台创建集合并确认当前环境 ID

### 上传体积超限
- 保持 `project.config.json` 的 `minified: true`
- 保持 `app.json` 的 `lazyCodeLoading: requiredComponents`
- 使用 `scripts/analyze_pkg_size.js` 定位大文件

### 页面请求慢
- 检查是否绕过了 `utils/api.js`
- 检查是否关闭了首页缓存
