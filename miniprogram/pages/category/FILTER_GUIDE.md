# 分类筛选功能说明

## 功能概述

已实现多级分类筛选功能，支持：
- 茶叶：品类、年份
- 陈皮：产区、年份、泥料
- 紫砂壶：器型、成型方式

## 筛选项配置

### 茶叶分类筛选

**品类**：
- 全部
- 绿茶
- 红茶
- 乌龙
- 白茶
- 黄茶
- 黑茶
- 普洱

**年份**：
- 全部
- 一年
- 三年
- 五年
- 十年
- 十五年
- 十五年以上

### 陈皮分类筛选

**产区**：
- 全部
- 新会
- 梅江
- 茶坑
- 天马
- 西甲
- 东甲
- 其他

**年份**：
- 全部
- 三年
- 五年
- 十年
- 十年以上

**泥料**：
- 全部
- 大红袍
- 天青泥
- 底槽清
- 红皮龙
- 段泥

### 紫砂壶分类筛选

**器型**：
- 全部
- 西施
- 德钟
- 仿古

**成型方式**：
- 全部
- 全手工
- 半手工

## 数据库结构要求

商品数据需要包含 `filters` 字段来支持筛选功能：

```json
{
  "_id": "product_id",
  "name": "西湖龙井",
  "category": "tea",
  "price": 29800,
  "images": ["https://..."],
  "description": "正宗西湖龙井",
  "stock": 100,
  "sales": 50,
  "status": 1,
  "filters": {
    "type": "green",    // 品类：绿茶
    "age": "3"          // 年份：三年
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 茶叶商品示例

```json
{
  "name": "西湖龙井特级",
  "category": "tea",
  "filters": {
    "type": "green",
    "age": "1"
  }
}
```

### 陈皮商品示例

```json
{
  "name": "新会陈皮十年",
  "category": "chenpi",
  "filters": {
    "origin": "xinhui",
    "age": "10",
    "type": "dahongpao"
  }
}
```

### 紫砂壶商品示例

```json
{
  "name": "西施壶全手工",
  "category": "teapot",
  "filters": {
    "shape": "xishi",
    "craft": "full"
  }
}
```

## 筛选逻辑

1. 用户点击分类（茶叶/陈皮/紫砂壶）
2. 显示对应分类的筛选项
3. 用户点击筛选项标题展开/收起选项列表
4. 用户选择具体筛选值
5. 自动重新加载商品列表
6. 支持多个筛选条件组合

## 云函数支持

`getProducts` 云函数已更新，支持以下筛选参数：

```javascript
{
  category: 'tea',      // 分类
  type: 'green',        // 茶叶品类
  age: '3',             // 年份
  origin: 'xinhui',     // 陈皮产区
  shape: 'xishi',       // 紫砂壶器型
  craft: 'full',        // 紫砂壶成型方式
  page: 1,
  pageSize: 20
}
```

## 使用说明

### 1. 添加商品数据时包含 filters 字段

在云开发控制台或通过 `database-init` 云函数添加商品时，确保包含 `filters` 字段。

### 2. 筛选项 ID 对应关系

| 筛选项 | ID | 说明 |
|--------|-----|------|
| 绿茶 | green | 茶叶品类 |
| 红茶 | black | 茶叶品类 |
| 乌龙 | oolong | 茶叶品类 |
| 白茶 | white | 茶叶品类 |
| 黄茶 | yellow | 茶叶品类 |
| 黑茶 | dark | 茶叶品类 |
| 普洱 | puer | 茶叶品类 |
| 一年 | 1 | 年份 |
| 三年 | 3 | 年份 |
| 五年 | 5 | 年份 |
| 十年 | 10 | 年份 |
| 十五年 | 15 | 年份 |
| 十五年以上 | 15+ | 年份 |
| 新会 | xinhui | 陈皮产区 |
| 梅江 | meijian | 陈皮产区 |
| 茶坑 | chajiao | 陈皮产区 |
| 天马 | tianma | 陈皮产区 |
| 西甲 | xitian | 陈皮产区 |
| 东甲 | dongjia | 陈皮产区 |
| 大红袍 | dahongpao | 泥料 |
| 天青泥 | tianqing | 泥料 |
| 底槽清 | dicaoqing | 泥料 |
| 红皮龙 | hongpilong | 泥料 |
| 段泥 | duanni | 泥料 |
| 西施 | xishi | 器型 |
| 德钟 | dezhong | 器型 |
| 仿古 | fanggu | 器型 |
| 全手工 | full | 成型方式 |
| 半手工 | half | 成型方式 |

### 3. 测试数据示例

```javascript
// 在云开发控制台 products 集合中添加测试数据

// 茶叶商品
{
  "name": "西湖龙井特级",
  "category": "tea",
  "price": 29800,
  "originalPrice": 39800,
  "images": ["https://via.placeholder.com/400"],
  "description": "正宗西湖龙井，清香甘醇",
  "stock": 100,
  "sales": 50,
  "rating": 5.0,
  "reviewCount": 10,
  "status": 1,
  "filters": {
    "type": "green",
    "age": "3"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}

// 陈皮商品
{
  "name": "新会陈皮十年",
  "category": "chenpi",
  "price": 58000,
  "originalPrice": 68000,
  "images": ["https://via.placeholder.com/400"],
  "description": "新会核心产区十年陈皮",
  "stock": 50,
  "sales": 30,
  "rating": 4.9,
  "reviewCount": 8,
  "status": 1,
  "filters": {
    "origin": "xinhui",
    "age": "10",
    "type": "dahongpao"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}

// 紫砂壶商品
{
  "name": "西施壶全手工",
  "category": "teapot",
  "price": 128000,
  "originalPrice": 158000,
  "images": ["https://via.placeholder.com/400"],
  "description": "全手工西施壶，泥料纯正",
  "stock": 20,
  "sales": 15,
  "rating": 5.0,
  "reviewCount": 5,
  "status": 1,
  "filters": {
    "shape": "xishi",
    "craft": "full"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## UI 交互

1. **展开/收起**：点击筛选项标题可以展开或收起选项列表
2. **选择筛选**：点击具体选项进行筛选
3. **高亮显示**：已选中的筛选项会高亮显示（绿色背景）
4. **自动刷新**：选择筛选项后自动重新加载商品列表
5. **切换分类**：切换分类时会重置所有筛选条件

## 注意事项

1. 商品数据必须包含 `filters` 字段才能被筛选
2. `filters` 字段的值必须与筛选项的 ID 对应
3. 不同分类的商品需要配置不同的 `filters` 字段
4. 选择"全部"会清除该筛选条件
5. 多个筛选条件是"与"的关系（同时满足）

## 扩展筛选项

如需添加新的筛选项，需要修改以下文件：

1. **category.js** - 在对应分类的 filters 中添加新筛选项
2. **category.wxml** - UI 会自动渲染新筛选项
3. **getProducts/index.js** - 添加新的筛选参数处理逻辑

示例：为茶叶添加"产地"筛选

```javascript
// category.js
teaFilters: {
  type: { ... },
  age: { ... },
  origin: {  // 新增产地筛选
    name: '产地',
    expanded: false,
    options: [
      { id: 'all', name: '全部' },
      { id: 'hangzhou', name: '杭州' },
      { id: 'fujian', name: '福建' },
      { id: 'yunnan', name: '云南' }
    ],
    selected: 'all'
  }
}

// getProducts/index.js
const { 
  category, 
  type, 
  age,
  origin  // 新增参数
} = event

if (origin) {
  where['filters.origin'] = origin
}
```

## 部署说明

1. 更新 `category.js`、`category.wxml`、`category.wxss` 文件
2. 重新部署 `getProducts` 云函数
3. 在数据库中为商品添加 `filters` 字段
4. 测试筛选功能是否正常工作
