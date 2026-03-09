/**
 * 收货地址管理属性测试
 * Feature: tea-shop-miniprogram
 * 
 * 本测试验证收货地址管理功能的正确性属性
 */

const fc = require('fast-check');

// 模拟云开发环境
const mockCloud = {
  database: () => mockDb,
  getWXContext: () => ({
    OPENID: 'test_user_openid',
    APPID: 'test_appid',
    UNIONID: 'test_unionid'
  }),
  DYNAMIC_CURRENT_ENV: 'test'
};

// 模拟数据库
let mockDbData = {};
let mockIdCounter = 0;

const mockDb = {
  collection: (name) => ({
    where: (query) => ({
      get: async () => {
        const data = mockDbData[name] || [];
        const filtered = data.filter(item => {
          return Object.keys(query).every(key => {
            if (typeof query[key] === 'object' && query[key].neq !== undefined) {
              return item[key] !== query[key].neq;
            }
            return item[key] === query[key];
          });
        });
        return { data: filtered };
      },
      count: async () => {
        const data = mockDbData[name] || [];
        const filtered = data.filter(item => {
          return Object.keys(query).every(key => item[key] === query[key]);
        });
        return { total: filtered.length };
      },
      update: async ({ data: updateData }) => {
        const collection = mockDbData[name] || [];
        let updated = 0;
        collection.forEach(item => {
          const matches = Object.keys(query).every(key => {
            if (typeof query[key] === 'object' && query[key].neq !== undefined) {
              return item[key] !== query[key].neq;
            }
            return item[key] === query[key];
          });
          if (matches) {
            Object.assign(item, updateData);
            updated++;
          }
        });
        return { stats: { updated } };
      }
    }),
    add: async ({ data }) => {
      if (!mockDbData[name]) {
        mockDbData[name] = [];
      }
      const id = `mock_id_${mockIdCounter++}`;
      const newItem = { ...data, _id: id };
      mockDbData[name].push(newItem);
      return { _id: id };
    },
    doc: (id) => ({
      get: async () => {
        const collection = mockDbData[name] || [];
        const item = collection.find(i => i._id === id);
        return { data: item || null };
      },
      update: async ({ data: updateData }) => {
        const collection = mockDbData[name] || [];
        const item = collection.find(i => i._id === id);
        if (item) {
          Object.assign(item, updateData);
        }
        return { stats: { updated: item ? 1 : 0 } };
      },
      remove: async () => {
        const collection = mockDbData[name] || [];
        const index = collection.findIndex(i => i._id === id);
        if (index !== -1) {
          collection.splice(index, 1);
        }
        return { stats: { removed: index !== -1 ? 1 : 0 } };
      }
    })
  }),
  command: {
    neq: (value) => ({ neq: value })
  }
};

// 重置数据库
function resetMockDb() {
  mockDbData = {};
  mockIdCounter = 0;
}

// 验证手机号格式（必须是11位数字）
function validatePhone(phone) {
  return /^\d{11}$/.test(phone);
}

// 模拟添加地址函数
async function addAddress(userId, addressData) {
  const { name, phone, province, city, district, detail, isDefault } = addressData;
  const db = mockCloud.database();

  // 验证必填字段
  if (!name || !phone || !province || !city || !district || !detail) {
    return {
      success: false,
      message: '请填写完整的地址信息'
    };
  }

  // 验证手机号格式
  if (!validatePhone(phone)) {
    return {
      success: false,
      message: '手机号必须是11位数字'
    };
  }

  // 检查地址数量限制（最多20个）
  const countResult = await db.collection('addresses')
    .where({ userId })
    .count();

  if (countResult.total >= 20) {
    return {
      success: false,
      message: '收货地址数量已达上限（20个）'
    };
  }

  // 如果设置为默认地址，先将其他地址的默认状态取消
  if (isDefault) {
    await db.collection('addresses')
      .where({
        userId,
        isDefault: true
      })
      .update({
        data: {
          isDefault: false
        }
      });
  }

  // 添加新地址
  const result = await db.collection('addresses').add({
    data: {
      userId,
      name,
      phone,
      province,
      city,
      district,
      detail,
      isDefault: isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  return {
    success: true,
    data: {
      _id: result._id
    },
    message: '添加地址成功'
  };
}

// 模拟更新地址函数
async function updateAddress(userId, addressId, addressData) {
  const { name, phone, province, city, district, detail, isDefault } = addressData;
  const db = mockCloud.database();

  // 验证地址ID
  if (!addressId) {
    return {
      success: false,
      message: '地址ID不能为空'
    };
  }

  // 验证必填字段
  if (!name || !phone || !province || !city || !district || !detail) {
    return {
      success: false,
      message: '请填写完整的地址信息'
    };
  }

  // 验证手机号格式
  if (!validatePhone(phone)) {
    return {
      success: false,
      message: '手机号必须是11位数字'
    };
  }

  // 验证地址是否属于当前用户
  const addressResult = await db.collection('addresses')
    .doc(addressId)
    .get();

  if (!addressResult.data || addressResult.data.userId !== userId) {
    return {
      success: false,
      message: '地址不存在或无权限修改'
    };
  }

  // 如果设置为默认地址，先将其他地址的默认状态取消
  if (isDefault) {
    await db.collection('addresses')
      .where({
        userId,
        isDefault: true,
        _id: mockDb.command.neq(addressId)
      })
      .update({
        data: {
          isDefault: false
        }
      });
  }

  // 更新地址
  await db.collection('addresses')
    .doc(addressId)
    .update({
      data: {
        name,
        phone,
        province,
        city,
        district,
        detail,
        isDefault: isDefault || false,
        updatedAt: new Date()
      }
    });

  return {
    success: true,
    message: '更新地址成功'
  };
}

// 生成器：有效的手机号（11位数字）
const validPhoneArbitrary = fc.tuple(
  fc.integer({ min: 1, max: 9 }),
  fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
).map(([first, rest]) => first.toString() + rest.join(''));

// 生成器：地址数据
const addressDataArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  phone: validPhoneArbitrary,
  province: fc.constantFrom('广东省', '北京市', '上海市', '浙江省', '江苏省'),
  city: fc.constantFrom('广州市', '深圳市', '北京市', '上海市', '杭州市'),
  district: fc.constantFrom('天河区', '南山区', '朝阳区', '浦东新区', '西湖区'),
  detail: fc.string({ minLength: 1, maxLength: 100 }),
  isDefault: fc.boolean()
});

describe('收货地址管理属性测试', () => {
  beforeEach(() => {
    resetMockDb();
  });

  /**
   * 属性 11：手机号格式验证
   * **验证需求：10.3**
   * 
   * 对于任意收货地址，其手机号字段应该是恰好11位的数字字符串
   */
  test('属性 11：手机号格式验证 - 有效手机号应该通过验证', async () => {
    await fc.assert(
      fc.asyncProperty(
        addressDataArbitrary,
        async (addressData) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          const result = await addAddress(userId, addressData);
          
          // 有效的手机号应该添加成功
          expect(result.success).toBe(true);
          expect(result.data._id).toBeDefined();
          
          // 验证数据库中的手机号格式
          const db = mockCloud.database();
          const addresses = await db.collection('addresses')
            .where({ userId })
            .get();
          
          expect(addresses.data.length).toBe(1);
          const savedAddress = addresses.data[0];
          expect(validatePhone(savedAddress.phone)).toBe(true);
          expect(savedAddress.phone).toMatch(/^\d{11}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性 11：手机号格式验证 - 无效手机号应该被拒绝
   * **验证需求：10.3**
   */
  test('属性 11：手机号格式验证 - 无效手机号应该被拒绝', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成各种无效的手机号
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 10 }), // 太短
          fc.string({ minLength: 12, maxLength: 20 }), // 太长
          fc.string({ minLength: 11, maxLength: 11 }).filter(s => !/^\d{11}$/.test(s)), // 包含非数字
          fc.constant(''), // 空字符串
          fc.constant('abc12345678'), // 包含字母
          fc.constant('123-4567-8901') // 包含特殊字符
        ),
        fc.string({ minLength: 1, maxLength: 20 }), // name
        fc.string({ minLength: 1, maxLength: 100 }), // detail
        async (invalidPhone, name, detail) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          const addressData = {
            name,
            phone: invalidPhone,
            province: '广东省',
            city: '广州市',
            district: '天河区',
            detail,
            isDefault: false
          };
          
          const result = await addAddress(userId, addressData);
          
          // 无效的手机号应该添加失败
          expect(result.success).toBe(false);
          expect(result.message).toContain('手机号');
          
          // 验证数据库中没有添加记录
          const db = mockCloud.database();
          const addresses = await db.collection('addresses')
            .where({ userId })
            .get();
          
          expect(addresses.data.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性 12：地址数量限制
   * **验证需求：10.7**
   * 
   * 对于任意用户，其收货地址数量应该不超过20个
   */
  test('属性 12：地址数量限制 - 最多20个地址', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 25 }), // 尝试添加的地址数量
        async (attemptCount) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          let successCount = 0;
          let failCount = 0;
          
          // 尝试添加多个地址
          for (let i = 0; i < attemptCount; i++) {
            const addressData = {
              name: `用户${i}`,
              phone: `1${String(i).padStart(10, '0')}`,
              province: '广东省',
              city: '广州市',
              district: '天河区',
              detail: `详细地址${i}`,
              isDefault: false
            };
            
            const result = await addAddress(userId, addressData);
            
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              // 超过20个后应该提示上限
              expect(result.message).toContain('上限');
            }
          }
          
          // 验证最多只能添加20个地址
          expect(successCount).toBeLessThanOrEqual(20);
          
          // 如果尝试添加超过20个，应该有失败的
          if (attemptCount > 20) {
            expect(failCount).toBeGreaterThan(0);
            expect(successCount).toBe(20);
          }
          
          // 验证数据库中的地址数量
          const db = mockCloud.database();
          const countResult = await db.collection('addresses')
            .where({ userId })
            .count();
          
          expect(countResult.total).toBeLessThanOrEqual(20);
          expect(countResult.total).toBe(successCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性：默认地址唯一性
   * **验证需求：10.4, 10.5**
   * 
   * 对于任意用户，最多只能有一个默认地址
   */
  test('属性：默认地址唯一性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(addressDataArbitrary, { minLength: 2, maxLength: 10 }),
        async (addressesData) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          
          // 添加多个地址
          for (const addressData of addressesData) {
            await addAddress(userId, addressData);
          }
          
          // 验证数据库中最多只有一个默认地址
          const db = mockCloud.database();
          const defaultAddresses = await db.collection('addresses')
            .where({
              userId,
              isDefault: true
            })
            .get();
          
          expect(defaultAddresses.data.length).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：设置默认地址会取消其他默认地址
   * **验证需求：10.4**
   */
  test('属性：设置默认地址会取消其他默认地址', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(addressDataArbitrary, { minLength: 3, maxLength: 5 }),
        fc.integer({ min: 0, max: 2 }), // 选择哪个地址设为默认
        async (addressesData, defaultIndex) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          const addressIds = [];
          
          // 添加多个地址，都不设为默认
          for (const addressData of addressesData) {
            const result = await addAddress(userId, {
              ...addressData,
              isDefault: false
            });
            addressIds.push(result.data._id);
          }
          
          // 将其中一个设为默认
          const targetIndex = defaultIndex % addressIds.length;
          const db = mockCloud.database();
          const targetAddress = await db.collection('addresses')
            .doc(addressIds[targetIndex])
            .get();
          
          await updateAddress(userId, addressIds[targetIndex], {
            ...targetAddress.data,
            isDefault: true
          });
          
          // 验证只有一个默认地址
          const defaultAddresses = await db.collection('addresses')
            .where({
              userId,
              isDefault: true
            })
            .get();
          
          expect(defaultAddresses.data.length).toBe(1);
          expect(defaultAddresses.data[0]._id).toBe(addressIds[targetIndex]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：更新地址时手机号验证
   * **验证需求：10.3**
   */
  test('属性：更新地址时手机号验证', async () => {
    await fc.assert(
      fc.asyncProperty(
        addressDataArbitrary,
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.string({ minLength: 12, maxLength: 20 }),
          fc.constant('abc12345678')
        ),
        async (initialAddress, invalidPhone) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          
          // 先添加一个有效地址
          const addResult = await addAddress(userId, initialAddress);
          expect(addResult.success).toBe(true);
          
          const addressId = addResult.data._id;
          
          // 尝试用无效手机号更新
          const updateResult = await updateAddress(userId, addressId, {
            ...initialAddress,
            phone: invalidPhone
          });
          
          // 应该更新失败
          expect(updateResult.success).toBe(false);
          expect(updateResult.message).toContain('手机号');
          
          // 验证数据库中的手机号没有被改变
          const db = mockCloud.database();
          const address = await db.collection('addresses')
            .doc(addressId)
            .get();
          
          expect(address.data.phone).toBe(initialAddress.phone);
          expect(validatePhone(address.data.phone)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性：地址数据完整性
   * **验证需求：10.2**
   */
  test('属性：地址数据完整性 - 所有必填字段都必须提供', async () => {
    await fc.assert(
      fc.asyncProperty(
        addressDataArbitrary,
        fc.constantFrom('name', 'phone', 'province', 'city', 'district', 'detail'),
        async (addressData, missingField) => {
          resetMockDb();
          
          const userId = 'test_user_123';
          
          // 创建缺少某个字段的地址数据
          const incompleteAddress = { ...addressData };
          delete incompleteAddress[missingField];
          
          const result = await addAddress(userId, incompleteAddress);
          
          // 应该添加失败
          expect(result.success).toBe(false);
          expect(result.message).toContain('完整');
          
          // 验证数据库中没有添加记录
          const db = mockCloud.database();
          const addresses = await db.collection('addresses')
            .where({ userId })
            .get();
          
          expect(addresses.data.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
