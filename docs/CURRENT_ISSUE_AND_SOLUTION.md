# 当前问题和解决方案

## 问题描述

登录功能失败，云函数返回的是默认的微信上下文信息，而不是我们编写的登录逻辑结果。

从日志看到：
- 云函数只输出 "Hello World"
- 返回结果是：`{"code":"...", "tcbContext":{}, "userInfo":{...}}`
- 执行时间只有 2ms

**根本原因**：云端的云函数代码没有更新，还是旧的示例代码。

## 解决方案

### 方案1：在云开发控制台直接编辑代码

1. 打开云开发控制台
2. 点击"云函数" → 找到 `login`
3. 点击"编辑代码"或"代码"标签
4. 删除所有现有代码
5. 复制下面的完整代码粘贴进去
6. 点击"保存并安装依赖"

```javascript
// 云函数：用户登录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  console.log('login 云函数开始执行')
  console.log('event:', event)
  
  const wxContext = cloud.getWXContext()
  console.log('wxContext:', wxContext)
  
  const { OPENID, APPID, UNIONID } = wxContext

  if (!OPENID) {
    console.error('无法获取 OPENID')
    return {
      code: -1,
      message: '无法获取用户信息'
    }
  }

  try {
    console.log('开始查询用户，OPENID:', OPENID)
    
    // 查询用户是否已存在
    const userResult = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    console.log('查询结果:', userResult)

    let userId
    let userInfo
    let isNewUser = false

    if (userResult.data.length === 0) {
      console.log('新用户，开始创建')
      
      // 新用户，创建用户记录
      const newUser = {
        openid: OPENID,
        unionid: UNIONID || '',
        nickname: '微信用户',
        avatar: '',
        phone: '',
        memberLevel: 0,
        totalSpent: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      
      const createResult = await db.collection('users').add({
        data: newUser
      })
      
      console.log('创建结果:', createResult)
      
      userId = createResult._id
      userInfo = { ...newUser, _id: userId }
      isNewUser = true
    } else {
      console.log('老用户，更新登录时间')
      
      // 老用户，更新最后登录时间
      const user = userResult.data[0]
      userId = user._id
      userInfo = user
      
      await db.collection('users')
        .doc(userId)
        .update({
          data: {
            updatedAt: db.serverDate()
          }
        })
    }

    // 生成token
    const token = Buffer.from(`${OPENID}_${Date.now()}`).toString('base64')

    const result = {
      code: 0,
      message: '登录成功',
      data: {
        userId,
        openid: OPENID,
        token,
        isNewUser,
        userInfo: {
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          memberLevel: userInfo.memberLevel,
          totalSpent: userInfo.totalSpent
        }
      }
    }
    
    console.log('返回结果:', result)
    return result
    
  } catch (err) {
    console.error('登录失败，错误:', err)
    return {
      code: -1,
      message: '登录失败: ' + err.message,
      error: err.message,
      stack: err.stack
    }
  }
}
```

### 方案2：删除后重新创建云函数

1. 在云开发控制台删除 `login` 云函数
2. 在微信开发者工具中，右键 `cloudfunctions/login`
3. 选择"创建并部署云函数"或"上传并部署"
4. 等待部署完成

### 方案3：使用命令行部署

如果开发者工具有终端：

```bash
# 进入 login 云函数目录
cd cloudfunctions/login

# 安装依赖
npm install

# 返回项目根目录
cd ../..

# 然后在开发者工具中右键上传
```

## 验证部署是否成功

### 1. 在云控制台测试

1. 云开发控制台 → 云函数 → login
2. 点击"云端测试"
3. 输入测试参数：
```json
{
  "code": "test123"
}
```
4. 点击"测试"按钮
5. 查看返回结果和日志

**期望看到的日志**：
```
login 云函数开始执行
event: { code: 'test123' }
wxContext: { OPENID: '...', ... }
开始查询用户，OPENID: ...
```

**期望的返回结果**：
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": "...",
    "openid": "...",
    "token": "...",
    "isNewUser": true,
    "userInfo": {
      "nickname": "微信用户",
      "avatar": "",
      "memberLevel": 0,
      "totalSpent": 0
    }
  }
}
```

### 2. 在小程序中测试

1. 重新编译小程序
2. 进入"我的"页面
3. 点击"点击登录"
4. 查看控制台日志

**期望看到**：
```
开始获取登录凭证...
登录凭证结果: {code: "..."}
调用登录云函数，code: ...
云函数返回结果: {...}
result.result JSON: {"code":0,"message":"登录成功",...}
登录成功，userId: ...
```

## 如果还是不行

### 检查项目配置

1. 确认 `project.config.json` 中的 `cloudfunctionRoot` 配置：
```json
{
  "cloudfunctionRoot": "cloudfunctions/"
}
```

2. 确认云环境 ID 正确：`cloud1-0gswdm2a347e7be7`

3. 确认 AppID 正确：`wxaa48431da9ffdad2`

### 查看详细错误

1. 云开发控制台 → 云函数 → login → 日志
2. 查看最新的调用记录
3. 展开查看详细的 console.log 输出
4. 截图发给我

## 临时解决方案

如果云函数一直无法更新，可以暂时使用模拟登录：

在 `pages/user/user.js` 中，临时修改登录逻辑：

```javascript
async onLogin() {
  try {
    wx.showLoading({ title: '登录中...' })
    
    // 临时模拟登录
    const mockUserId = 'mock_' + Date.now()
    const mockToken = 'mock_token_' + Date.now()
    const mockUserInfo = {
      nickname: '测试用户',
      avatar: '',
      memberLevel: 0,
      totalSpent: 0
    }
    
    wx.setStorageSync('token', mockToken)
    wx.setStorageSync('userId', mockUserId)
    wx.setStorageSync('userInfo', mockUserInfo)
    
    this.setData({ 
      isLogin: true,
      userInfo: mockUserInfo
    })
    
    wx.hideLoading()
    wx.showToast({
      title: '登录成功（模拟）',
      icon: 'success'
    })
  } catch (err) {
    wx.hideLoading()
    wx.showToast({
      title: '登录失败',
      icon: 'none'
    })
  }
}
```

这样至少可以先测试其他功能，等云函数问题解决后再改回来。
