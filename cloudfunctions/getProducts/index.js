// 云函数：获取商品列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const TEA_SUB_CATEGORY_LABEL_MAP = {
  yinzhen: '银针',
  mudan: '牡丹',
  shoumei: '寿眉',
  gongmei: '贡眉'
}

const CHENPI_ORIGIN_LABEL_MAP = {
  yixian: '一线',
  meijian: '梅江',
  chajiao: '茶坑',
  tianma: '天马',
  xitian: '西甲',
  dongjia: '东甲',
  other: '其他'
}

const TEAPOT_SHAPE_LABEL_MAP = {
  ziyeshipiao: '子冶石瓢',
  dezhong: '德钟',
  duozhi: '掇只'
}

const TEAPOT_MATERIAL_LABEL_MAP = {
  zini: '紫泥',
  putongzini: '普通紫泥',
  tianqingni: '天青泥',
  dicaoqing: '底槽清',
  hongpilong: '红皮龙',
  duanni: '段泥'
}

const TEAPOT_CRAFT_LABEL_MAP = {
  full: '全手工',
  half: '半手工'
}

const YEAR_LABEL_MAP = {
  '1': '一年',
  '3': '三年',
  '5': '五年',
  '10': '十年',
  '15': '十五年',
  '10+': '十年以上',
  '15+': '十五年以上'
}

function buildInValues(values = []) {
  const out = values
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map((v) => String(v))
  return [...new Set(out)]
}

exports.main = async (event, context) => {
  const { 
    category, 
    page = 1, 
    pageSize = 20,
    orderBy = 'sales',        // 排序字段：sales/rating/price/createdAt
    orderDirection = 'desc',  // 排序方向：desc/asc
    // 茶叶筛选
    type,      // 品类
    age,       // 年份
    // 陈皮筛选
    origin,    // 产区
    // 紫砂壶筛选
    shape,     // 器型
    craft,     // 成型方式
    // 新版筛选参数（与前端字段一致）
    subCategory,
    year,
    gardenType,
    material,
    craftType
  } = event

  try {
    const baseWhere = { status: 1 }
    if (category) baseWhere.category = category

    // 统一新旧参数
    const normalized = {
      subCategory: subCategory || type || shape,
      year: year || age,
      origin,
      gardenType,
      material,
      craftType: craftType || craft
    }

    const skip = (page - 1) * pageSize
    const order = orderDirection === 'asc' ? 'asc' : 'desc'

    const allowedOrderFields = ['sales', 'rating', 'price', 'createdAt', 'createTime']
    const safeOrderBy = allowedOrderFields.indexOf(orderBy) !== -1 ? orderBy : 'sales'

    const queryByWhere = async (where) => {
      try {
        const result = await db.collection('products')
          .where(where)
          .orderBy(safeOrderBy, order)
          .skip(skip)
          .limit(pageSize)
          .get()

        const countResult = await db.collection('products')
          .where(where)
          .count()

        return {
          list: result.data,
          total: countResult.total
        }
      } catch (err) {
        // 兜底：当缺少复合索引或排序字段异常时，降级为不排序查询，避免直接 500
        console.warn('[getProducts] orderBy 查询失败，降级无排序查询', {
          where,
          orderBy: safeOrderBy,
          errMsg: err && (err.errMsg || err.message)
        })

        const result = await db.collection('products')
          .where(where)
          .skip(skip)
          .limit(pageSize)
          .get()

        const countResult = await db.collection('products')
          .where(where)
          .count()

        return {
          list: result.data,
          total: countResult.total
        }
      }
    }

    // 新版数据结构：直接使用商品字段筛选
    const directWhere = { ...baseWhere }

    if (normalized.subCategory) {
      let subValues = [normalized.subCategory]
      if (category === 'tea') {
        subValues.push(TEA_SUB_CATEGORY_LABEL_MAP[normalized.subCategory])
      } else if (category === 'teapot') {
        subValues.push(TEAPOT_SHAPE_LABEL_MAP[normalized.subCategory])
      }
      subValues = buildInValues(subValues)
      directWhere.subCategory = subValues.length > 1 ? _.in(subValues) : subValues[0]
    }

    if (normalized.year) {
      const yearValues = buildInValues([normalized.year, YEAR_LABEL_MAP[normalized.year]])
      directWhere.year = yearValues.length > 1 ? _.in(yearValues) : yearValues[0]
    }

    if (normalized.origin) {
      const originValues = buildInValues([normalized.origin, CHENPI_ORIGIN_LABEL_MAP[normalized.origin]])
      directWhere.origin = originValues.length > 1 ? _.in(originValues) : originValues[0]
    }

    if (normalized.gardenType) {
      directWhere.gardenType = normalized.gardenType
    }

    if (normalized.material) {
      const materialValues = buildInValues([normalized.material, TEAPOT_MATERIAL_LABEL_MAP[normalized.material]])
      directWhere.material = materialValues.length > 1 ? _.in(materialValues) : materialValues[0]
    }

    if (normalized.craftType) {
      const craftValues = buildInValues([normalized.craftType, TEAPOT_CRAFT_LABEL_MAP[normalized.craftType]])
      directWhere.craftType = craftValues.length > 1 ? _.in(craftValues) : craftValues[0]
    }

    let queryResult = await queryByWhere(directWhere)

    // 兼容旧版数据结构：filters.* 字段
    const hasDirectFilters = Object.keys(directWhere).length > Object.keys(baseWhere).length
    if (hasDirectFilters && queryResult.total === 0) {
      const legacyWhere = { ...baseWhere }

      if (normalized.year) legacyWhere['filters.age'] = normalized.year
      if (normalized.origin) legacyWhere['filters.origin'] = normalized.origin
      if (normalized.craftType) legacyWhere['filters.craft'] = normalized.craftType

      if (normalized.subCategory) {
        if (category === 'teapot') {
          legacyWhere['filters.shape'] = normalized.subCategory
        } else {
          legacyWhere['filters.type'] = normalized.subCategory
        }
      }

      const hasLegacyFilters = Object.keys(legacyWhere).length > Object.keys(baseWhere).length
      if (hasLegacyFilters) {
        queryResult = await queryByWhere(legacyWhere)
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: queryResult.list,
        total: queryResult.total,
        page,
        pageSize,
        hasMore: skip + queryResult.list.length < queryResult.total
      }
    }
  } catch (err) {
    console.error('获取商品列表失败', err)
    return {
      code: -1,
      message: '获取商品列表失败',
      error: err && (err.errMsg || err.message || String(err))
    }
  }
}
