# 用户登录属性测试 - 设置指南

## 任务完成情况

✅ **任务 2.2：编写用户登录属性测试** 已完成

本任务实现了对需求 1.2（用户授权成功后自动创建账户）的属性测试验证。

## 创建的文件

### 1. 测试配置文件

- **`package.json`** - 项目依赖和测试脚本配置
  - 包含 Jest 和 fast-check 依赖
  - 配置了测试脚本和覆盖率设置

### 2. 测试文件

- **`cloudfunctions/login/login.test.js`** - 属性测试
  - 验证4个核心属性，每个运行100次迭代
  - 使用 fast-check 生成随机输入
  - 验证需求 1.2：授权成功后用户记录被创建

- **`cloudfunctions/login/login.unit.test.js`** - 单元测试
  - 13个具体场景测试
  - 覆盖新用户登录、老用户登录、Token生成、边界情况、并发登录

### 3. 文档文件

- **`cloudfunctions/login/TEST_DOCUMENTATION.md`** - 详细测试文档
  - 测试策略说明
  - 所有测试用例的详细描述
  - 运行指南和故障排除

- **`tests/README.md`** - 测试说明
  - 环境要求
  - 安装和运行指南
  - 故障排除

### 4. 运行脚本

- **`run-tests.bat`** - Windows批处理脚本
- **`run-tests.sh`** - Unix/Linux/Mac Shell脚本
  - 提供交互式菜单
  - 自动检查环境
  - 支持多种测试运行模式

## 快速开始

### 前置要求

1. **安装 Node.js**（版本 >= 14.x）
   - 下载地址：https://nodejs.org/
   - 验证安装：`node --version`

2. **安装 npm**（通常随 Node.js 一起安装）
   - 验证安装：`npm --version`

### 安装步骤

#### Windows 用户

1. 打开命令提示符（CMD）或 PowerShell
2. 进入项目根目录
3. 运行测试脚本：
   ```cmd
   run-tests.bat
   ```
4. 选择选项 6 安装依赖
5. 选择选项 1 运行所有测试

#### Mac/Linux 用户

1. 打开终端
2. 进入项目根目录
3. 给脚本添加执行权限：
   ```bash
   chmod +x run-tests.sh
   ```
4. 运行测试脚本：
   ```bash
   ./run-tests.sh
   ```
5. 选择选项 6 安装依赖
6. 选择选项 1 运行所有测试

### 手动安装和运行

如果不使用脚本，可以手动执行：

```bash
# 1. 安装依赖
npm install

# 2. 运行所有测试
npm test

# 3. 运行属性测试
npm test -- cloudfunctions/login/login.test.js

# 4. 运行单元测试
npm test -- cloudfunctions/login/login.unit.test.js

# 5. 生成覆盖率报告
npm run test:coverage
```

## 测试内容

### 属性测试（Property-Based Testing）

**验证需求：1.2 - 授权成功后用户记录被创建**

1. **属性：授权成功后用户记录被创建**
   - 对于任意有效的openid，首次登录时应创建用户记录
   - 运行100次迭代，使用随机生成的openid和unionid

2. **属性：重复登录不创建新用户记录**
   - 对于已存在的用户，再次登录不应创建新记录
   - 验证用户ID保持不变

3. **属性：每次登录都生成新的token**
   - 确保每次登录的token都是唯一的
   - 运行50次迭代

4. **属性：不同用户有不同的userId**
   - 确保不同openid创建的用户有不同的userId
   - 运行100次迭代

### 单元测试（Unit Testing）

涵盖13个具体场景：
- 新用户登录（3个测试）
- 老用户登录（3个测试）
- Token生成（2个测试）
- 边界情况（3个测试）
- 并发登录（2个测试）

## 预期测试结果

### 成功输出示例

```
PASS  cloudfunctions/login/login.test.js
  用户登录属性测试
    ✓ 属性：授权成功后用户记录被创建 (1234ms)
    ✓ 属性：重复登录不创建新用户记录 (2345ms)
    ✓ 属性：每次登录都生成新的token (567ms)
    ✓ 属性：不同用户有不同的userId (1890ms)

PASS  cloudfunctions/login/login.unit.test.js
  用户登录单元测试
    ✓ 所有13个测试通过

Test Suites: 2 passed, 2 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        6.789s
```

## 测试特点

### 属性测试的优势

1. **广泛覆盖**：通过随机生成输入，测试大量场景
2. **发现边界问题**：自动发现开发者未考虑的边界情况
3. **自动缩减**：失败时自动找到最小反例
4. **可重现**：使用种子值可以重现失败的测试

### 测试设计原则

1. **隔离性**：每个测试独立运行，使用模拟数据库
2. **可重复性**：测试结果可重现
3. **快速执行**：所有测试在几秒内完成
4. **清晰反馈**：失败时提供详细的错误信息

## 故障排除

### 问题：npm 命令不存在

**解决方案**：
1. 安装 Node.js：https://nodejs.org/
2. 重启终端/命令提示符
3. 验证安装：`node --version` 和 `npm --version`

### 问题：依赖安装失败

**解决方案**：
```bash
# 清除缓存
npm cache clean --force

# 删除旧的依赖
rm -rf node_modules package-lock.json  # Mac/Linux
# 或
rmdir /s node_modules & del package-lock.json  # Windows

# 重新安装
npm install
```

### 问题：测试失败

**解决方案**：
1. 查看错误信息，确认是代码问题还是环境问题
2. 对于属性测试失败，fast-check会提供反例
3. 使用反例进行调试：
   ```javascript
   // 在测试中添加
   console.log('失败的输入:', openid, unionid);
   ```

### 问题：权限错误（Mac/Linux）

**解决方案**：
```bash
# 给脚本添加执行权限
chmod +x run-tests.sh
```

## 下一步

测试已经设置完成，您可以：

1. ✅ 运行测试验证功能正确性
2. ✅ 查看测试覆盖率报告
3. ✅ 根据需要调整测试参数（如迭代次数）
4. ✅ 继续实现其他功能的测试

## 技术栈

- **测试框架**：Jest 29.5.0
- **属性测试库**：fast-check 3.15.0
- **测试环境**：Node.js
- **模拟策略**：内存数据库模拟

## 参考文档

- [Jest 官方文档](https://jestjs.io/)
- [fast-check 官方文档](https://github.com/dubzzz/fast-check)
- [属性测试指南](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [测试详细文档](cloudfunctions/login/TEST_DOCUMENTATION.md)

## 联系支持

如果遇到问题：
1. 查看 `tests/README.md` 中的故障排除部分
2. 查看 `cloudfunctions/login/TEST_DOCUMENTATION.md` 中的详细说明
3. 检查测试输出中的错误信息

---

**任务状态**：✅ 完成

**验证需求**：1.2 - WHEN 用户授权成功，THE 小程序系统 SHALL 自动创建用户账户并完成登录

**测试方法**：属性测试 + 单元测试

**测试覆盖**：17个测试用例，400+次迭代
