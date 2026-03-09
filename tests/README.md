# 测试说明

## 环境要求

- Node.js >= 14.x
- npm >= 6.x

## 安装依赖

在项目根目录运行：

```bash
npm install
```

这将安装以下测试依赖：
- `jest`: 单元测试框架
- `fast-check`: 属性测试库
- `@types/jest`: Jest类型定义

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行测试并监听文件变化

```bash
npm run test:watch
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行特定测试文件

```bash
npm test -- cloudfunctions/login/login.test.js
```

## 测试文件位置

- 用户登录属性测试: `cloudfunctions/login/login.test.js`
- 商品分类过滤属性测试: `cloudfunctions/getProducts/getProducts.test.js`
- 商品搜索属性测试: `cloudfunctions/searchProducts/searchProducts.test.js`
- 规格选择属性测试: `miniprogram/pages/product/product.test.js`

## 属性测试说明

属性测试使用 `fast-check` 库，通过生成大量随机输入来验证系统的通用属性。

### 用户登录属性测试

**验证需求：1.2 - WHEN 用户授权成功，THE 小程序系统 SHALL 自动创建用户账户并完成登录**

测试的属性包括：

1. **授权成功后用户记录被创建**
   - 对于任意有效的openid，首次登录时应在数据库中创建用户记录
   - 每次测试运行100次迭代

2. **重复登录不创建新用户记录**
   - 对于已存在的用户，再次登录不应创建新记录
   - 验证用户ID保持不变

3. **每次登录都生成新的token**
   - 确保每次登录的token都是唯一的
   - 验证token的有效性

4. **不同用户有不同的userId**
   - 确保不同openid创建的用户有不同的userId
   - 验证用户记录的唯一性

### 规格选择属性测试

**验证需求：4.4 - WHEN 用户选择规格，THE 小程序系统 SHALL 更新价格和库存显示**

测试的属性包括：

1. **属性 22：规格选择价格更新**（核心属性）
   - 对于任意商品和规格选择，显示的价格和库存应该等于对应SKU的价格和库存
   - 每次测试运行100次迭代

2. **不同规格有不同的价格和库存**
   - 选择不同规格应该显示不同的价格和库存

3. **规格选择的幂等性**
   - 多次选择同一个规格应该返回相同的价格和库存

4. **所有SKU都可以被正确选择**
   - 每个SKU都应该能够正确选择并显示其价格和库存

5. **规格文本正确生成**
   - 规格文本应该正确反映选中的规格值

6. **价格必须为正整数**
   - 显示的价格都应该是正整数（单位：分）

7. **库存必须为非负整数**
   - 显示的库存都应该是非负整数

8. **无效索引应该抛出错误**
   - 尝试选择不存在的规格索引应该抛出错误

详细文档：`miniprogram/pages/product/SPEC_SELECTION_TEST_GUIDE.md`

## 测试覆盖率目标

- 核心业务逻辑：>90%
- 工具函数：>80%
- 整体代码：>70%

## 注意事项

1. 属性测试默认运行100次迭代，可以通过修改 `numRuns` 参数调整
2. 测试使用模拟的云开发环境，不会影响真实数据库
3. 每个测试前会重置模拟数据库状态
4. 测试失败时会显示导致失败的具体输入值

## 故障排除

### 测试失败

如果属性测试失败，fast-check会提供导致失败的具体输入值。例如：

```
Property failed after 23 tests
{ seed: 1234567890, path: "22:0", endOnFailure: true }
Counterexample: ["test_openid_123", ""]
```

这表示在第23次测试时失败，使用的输入是 `openid="test_openid_123"` 和 `unionid=""`。

### 依赖安装问题

如果遇到依赖安装问题，尝试：

```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules和package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

## 持续集成

建议在CI/CD流程中添加测试步骤：

```yaml
# .github/workflows/test.yml 示例
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
```
