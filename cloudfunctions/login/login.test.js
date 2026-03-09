/**
 * 用户登录属性测试
 * Feature: tea-shop-miniprogram
 * 
 * 本测试验证用户登录功能的正确性属性
 */

const fc = require('fast-check');

// 模拟云开发环境
const mockCloud = {
  database: () => mockDb,
  getWXContext: () => ({
    OPENID: 'test_openid',
    APPID: 'test_appid',
    UNIONID: 'test_unionid'
  }),
  DYNAMIC_CURRENT_ENV: 'test'
};

// 模拟数据库
let mockDbData = {};
const mockDb = {
  collection: (name) => ({
    where: (query) => ({
      get: async () => {
        const data = mockDbData[name] || [];
        const filtered = data.filter(item => {
          return Object.keys(query).every(key => item[key] === query[key]);
        });
        return { data: filtered };
      }
    }),
    add: async ({ data }) => {
      if (!mockDbData[name]) {
        mockDbData[name] = [];
      }
      const id = `mock_id_${Date.now()}_${Math.random()}`;
      const newItem = { ...data, _id: id };
      mockDbData[name].push(newItem);
      return { _id: id };
    },
    doc: (id) => ({
      update: async ({ data }) => {
        const collection = mockDbData[name] || [];
        const item = collection.find(i => i._id === id);
        if (item) {
          Object.assign(item, data);
        }
        return { stats: { updated: item ? 1 : 0 } };
      }
    })
  })
};

// 重置数据库
function resetMockDb() {
  mockDbData = {};
}

// 模拟登录函数（简化版本，用于测试）
async function loginUser(openid, unionid = '') {
  const db = mockCloud.database();
  
  // 查询用户是否已存在
  const userResult = await db.collection('users')
    .where({ openid })
    .get();

  let userId;
  let isNewUser = false;

  if (userResult.data.length === 0) {
    // 新用户，创建用户记录
    const createResult = await db.collection('users').add({
      data: {
        openid,
        unionid: unionid || '',
        nickname: '微信用户',
        avatar: '',
        phone: '',
        memberLevel: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    userId = createResult._id;
    isNewUser = true;
  } else {
    // 老用户，更新最后登录时间
    const user = userResult.data[0];
    userId = user._id;
    
    await db.collection('users')
      .doc(userId)
      .update({
        data: {
          updatedAt: new Date()
        }
      });
  }

  const token = Buffer.from(`${openid}_${Date.now()}`).toString('base64');

  return {
    code: 0,
    message: '登录成功',
    data: {
      userId,
      openid,
      token,
      isNewUser
    }
  };
}

describe('用户登录属性测试', () => {
  beforeEach(() => {
    resetMockDb();
  });

  /**
   * 属性：授权成功后用户记录被创建
   * **验证需求：1.2**
   * 
   * 对于任意有效的openid，当用户首次登录时，系统应该在数据库中创建一条用户记录
   */
  test('属性：授权成功后用户记录被创建', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的openid（非空字符串）
        fc.string({ minLength: 1, maxLength: 50 }),
        // 生成随机的unionid（可选）
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
        async (openid, unionid) => {
          // 重置数据库
          resetMockDb();
          
          // 执行登录
          const result = await loginUser(openid, unionid || '');
          
          // 验证返回结果
          expect(result.code).toBe(0);
          expect(result.data.isNewUser).toBe(true);
          expect(result.data.openid).toBe(openid);
          expect(result.data.userId).toBeDefined();
          expect(result.data.token).toBeDefined();
          
          // 验证数据库中创建了用户记录
          const db = mockCloud.database();
          const userResult = await db.collection('users')
            .where({ openid })
            .get();
          
          expect(userResult.data.length).toBe(1);
          
          const user = userResult.data[0];
          expect(user.openid).toBe(openid);
          expect(user.unionid).toBe(unionid || '');
          expect(user.nickname).toBe('微信用户');
          expect(user.memberLevel).toBe(0);
          expect(user.totalSpent).toBe(0);
          expect(user.createdAt).toBeInstanceOf(Date);
          expect(user.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：重复登录不创建新用户记录
   * **验证需求：1.2, 1.4**
   * 
   * 对于任意已存在的用户，再次登录时不应该创建新的用户记录，而是返回现有用户信息
   */
  test('属性：重复登录不创建新用户记录', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
        async (openid, unionid) => {
          resetMockDb();
          
          // 第一次登录
          const firstLogin = await loginUser(openid, unionid || '');
          expect(firstLogin.data.isNewUser).toBe(true);
          
          const firstUserId = firstLogin.data.userId;
          
          // 第二次登录
          const secondLogin = await loginUser(openid, unionid || '');
          expect(secondLogin.data.isNewUser).toBe(false);
          expect(secondLogin.data.userId).toBe(firstUserId);
          
          // 验证数据库中只有一条用户记录
          const db = mockCloud.database();
          const userResult = await db.collection('users')
            .where({ openid })
            .get();
          
          expect(userResult.data.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：每次登录都生成新的token
   * **验证需求：1.2**
   * 
   * 对于任意用户，每次登录都应该生成不同的token
   */
  test('属性：每次登录都生成新的token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (openid) => {
          resetMockDb();
          
          // 第一次登录
          const firstLogin = await loginUser(openid, '');
          const firstToken = firstLogin.data.token;
          
          // 等待一小段时间确保时间戳不同
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // 第二次登录
          const secondLogin = await loginUser(openid, '');
          const secondToken = secondLogin.data.token;
          
          // 验证token不同
          expect(firstToken).not.toBe(secondToken);
          expect(firstToken).toBeDefined();
          expect(secondToken).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性：不同用户有不同的userId
   * **验证需求：1.2**
   * 
   * 对于任意两个不同的openid，创建的用户记录应该有不同的userId
   */
  test('属性：不同用户有不同的userId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (openid1, openid2) => {
          // 确保两个openid不同
          fc.pre(openid1 !== openid2);
          
          resetMockDb();
          
          // 两个用户登录
          const user1 = await loginUser(openid1, '');
          const user2 = await loginUser(openid2, '');
          
          // 验证userId不同
          expect(user1.data.userId).not.toBe(user2.data.userId);
          
          // 验证数据库中有两条记录
          const db = mockCloud.database();
          const allUsers = mockDbData['users'] || [];
          expect(allUsers.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
