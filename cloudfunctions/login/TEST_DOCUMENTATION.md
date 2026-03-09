# 用户登录功能测试文档

## 概述

本文档描述了用户登录功能的测试策略和测试用例。测试采用双重方法：
1. **属性测试（Property-Based Testing）**：验证通用属性在大量随机输入下的正确性
2. **单元测试（Unit Testing）**：验证具体场景和边界情况

## 验证需求

**需求 1.2**: WHEN 用户授权成功，THE 小程序系统 SHALL 自动创建用户账户并完成登录

## 测试文件

- `login.test.js` - 属性测试
- `login.unit.test.js` - 单元测试

## 属性测试

### 测试策略

属性测试使用 `fast-check` 库，通过生成大量随机输入来验证系统的通用属性。每个属性测试默认运行100次迭代。

### 测试属性

#### 1. 授权成功后用户记录被创建

**属性描述**：对于任意有效的openid，当用户首次登录时，系统应该在数据库中创建一条用户记录。

**输入生成**：
- `openid`: 1-50个字符的随机字符串
- `unionid`: 可选的1-50个字符的随机字符串

**验证点**：
- 返回码为0（成功）
- `isNewUser` 为 `true`
- 返回的 `openid` 与输入一致
- 生成了有效的 `userId` 和 `token`
- 数据库中存在该用户记录
- 用户记录包含所有必需字段：
  - `openid`
  - `unionid`
  - `nickname` = '微信用户'
  - `memberLevel` = 0
  - `totalSpent` = 0
  - `createdAt` 和 `updatedAt` 为有效日期

**迭代次数**：100次

#### 2. 重复登录不创建新用户记录

**属性描述**：对于任意已存在的用户，再次登录时不应该创建新的用户记录，而是返回现有用户信息。

**输入生成**：
- `openid`: 1-50个字符的随机字符串
- `unionid`: 可选的1-50个字符的随机字符串

**验证点**：
- 第一次登录：`isNewUser` 为 `true`
- 第二次登录：`isNewUser` 为 `false`
- 两次登录的 `userId` 相同
- 数据库中只有一条用户记录

**迭代次数**：100次

#### 3. 每次登录都生成新的token

**属性描述**：对于任意用户，每次登录都应该生成不同的token。

**输入生成**：
- `openid`: 1-50个字符的随机字符串

**验证点**：
- 两次登录生成的token不同
- 两个token都是有效的非空字符串

**迭代次数**：50次（因为需要等待时间戳变化）

#### 4. 不同用户有不同的userId

**属性描述**：对于任意两个不同的openid，创建的用户记录应该有不同的userId。

**输入生成**：
- `openid1`: 1-50个字符的随机字符串
- `openid2`: 1-50个字符的随机字符串
- 前置条件：`openid1 !== openid2`

**验证点**：
- 两个用户的 `userId` 不同
- 数据库中有两条用户记录

**迭代次数**：100次

## 单元测试

### 测试策略

单元测试验证具体的业务场景、边界情况和错误处理。

### 测试用例

#### 新用户登录

1. **应该创建新用户记录**
   - 输入：有效的openid和unionid
   - 验证：返回成功，isNewUser为true，包含userId和token

2. **应该设置默认用户信息**
   - 输入：有效的openid
   - 验证：用户记录包含默认值（nickname='微信用户', memberLevel=0, totalSpent=0）

3. **应该处理没有unionid的情况**
   - 输入：只有openid，没有unionid
   - 验证：用户记录的unionid为空字符串

#### 老用户登录

1. **应该返回现有用户信息**
   - 输入：已存在用户的openid
   - 验证：isNewUser为false，userId与首次登录相同

2. **应该更新最后登录时间**
   - 输入：已存在用户的openid
   - 验证：updatedAt时间戳增加

3. **不应该创建重复的用户记录**
   - 输入：多次使用相同openid登录
   - 验证：数据库中只有一条记录

#### Token生成

1. **应该生成有效的token**
   - 输入：有效的openid
   - 验证：token是非空字符串

2. **每次登录应该生成不同的token**
   - 输入：相同openid的两次登录
   - 验证：两个token不同

#### 边界情况

1. **应该处理空字符串openid**
   - 输入：openid = ''
   - 验证：登录成功，正确处理空字符串

2. **应该处理特殊字符openid**
   - 输入：包含特殊字符的openid
   - 验证：登录成功，正确存储特殊字符

3. **应该处理很长的openid**
   - 输入：1000个字符的openid
   - 验证：登录成功，正确处理长字符串

#### 并发登录

1. **应该正确处理同一用户的并发登录**
   - 输入：同时发起3个登录请求
   - 验证：所有请求都成功
   - 注意：简化实现可能创建多条记录，生产环境需要数据库锁

## 测试覆盖率

### 当前覆盖

- **属性测试**：4个核心属性
- **单元测试**：13个具体场景

### 覆盖的需求

- ✅ 需求 1.2：用户授权成功后自动创建账户
- ✅ 需求 1.4：自动登录状态恢复（通过重复登录测试验证）

### 未覆盖的需求

- ⚠️ 需求 1.1：首次打开请求授权（需要前端测试）
- ⚠️ 需求 1.3：拒绝授权的游客模式（需要前端测试）
- ⚠️ 需求 1.5：登录状态过期提示（需要集成测试）

## 运行测试

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行属性测试

```bash
npm test -- login.test.js
```

### 运行单元测试

```bash
npm test -- login.unit.test.js
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

## 测试结果示例

### 成功输出

```
PASS  cloudfunctions/login/login.test.js
  用户登录属性测试
    ✓ 属性：授权成功后用户记录被创建 (1234ms)
    ✓ 属性：重复登录不创建新用户记录 (2345ms)
    ✓ 属性：每次登录都生成新的token (567ms)
    ✓ 属性：不同用户有不同的userId (1890ms)

PASS  cloudfunctions/login/login.unit.test.js
  用户登录单元测试
    新用户登录
      ✓ 应该创建新用户记录 (5ms)
      ✓ 应该设置默认用户信息 (3ms)
      ✓ 应该处理没有unionid的情况 (2ms)
    老用户登录
      ✓ 应该返回现有用户信息 (4ms)
      ✓ 应该更新最后登录时间 (15ms)
      ✓ 不应该创建重复的用户记录 (6ms)
    Token生成
      ✓ 应该生成有效的token (2ms)
      ✓ 每次登录应该生成不同的token (12ms)
    边界情况
      ✓ 应该处理空字符串openid (2ms)
      ✓ 应该处理特殊字符openid (3ms)
      ✓ 应该处理很长的openid (4ms)
    并发登录
      ✓ 应该正确处理同一用户的并发登录 (8ms)

Test Suites: 2 passed, 2 total
Tests:       17 passed, 17 total
```

### 失败输出示例

如果属性测试失败，fast-check会提供反例：

```
FAIL  cloudfunctions/login/login.test.js
  用户登录属性测试
    ✕ 属性：授权成功后用户记录被创建 (234ms)

  ● 用户登录属性测试 › 属性：授权成功后用户记录被创建

    Property failed after 23 tests
    { seed: 1234567890, path: "22:0", endOnFailure: true }
    Counterexample: ["test_openid_123", ""]
    Shrunk 5 time(s)
    Got error: expect(received).toBe(expected)

    Expected: 0
    Received: -1
```

这表示在第23次测试时失败，使用的输入是 `openid="test_openid_123"` 和 `unionid=""`。

## 已知限制

1. **并发控制**：当前实现没有处理并发登录时的竞态条件。生产环境应该：
   - 在数据库中为openid字段添加唯一索引
   - 使用数据库事务确保原子性
   - 处理唯一索引冲突异常

2. **Token安全性**：当前使用简单的Base64编码。生产环境应该：
   - 使用JWT（JSON Web Token）
   - 添加过期时间
   - 使用密钥签名

3. **错误处理**：当前测试主要关注成功路径。应该添加：
   - 数据库连接失败的测试
   - 数据库操作超时的测试
   - 无效输入的测试

## 改进建议

1. **增加集成测试**：测试与真实云开发环境的集成
2. **增加性能测试**：测试高并发场景下的性能
3. **增加安全测试**：测试SQL注入、XSS等安全问题
4. **增加错误恢复测试**：测试各种异常情况的恢复机制

## 参考资料

- [fast-check 文档](https://github.com/dubzzz/fast-check)
- [Jest 文档](https://jestjs.io/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [属性测试最佳实践](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
