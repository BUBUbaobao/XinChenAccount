/**
 * wx.Storage 读写封装模块（带内存缓存 + 脏标记）
 *
 * 性能优化策略：
 * - 首次读取时从 Storage 加载并缓存到内存
 * - 后续读取直接从内存缓存返回，零 I/O 耗时
 * - 写入操作同步更新缓存 + Storage
 * - 版本号机制：页面可快速判断数据是否变更
 */

// ─── Storage Key 常量 ───
const KEYS = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  ACCOUNTS: 'accounts',
  RULES: 'rules',
  PARSE_LOGS: 'parse_logs',
  BUDGETS: 'budgets',
  AI_REPORTS: 'ai_reports',
  APP_CONFIG: 'app_config'
}

// ─── 内存缓存 ───
const _cache = {}         // { [key]: Array|Object }
const _loaded = {}        // { [key]: Boolean }  是否已从 Storage 加载
let _version = 0          // 全局版本号，每次写入 +1

// ─── 内部工具 ───

function _loadFromStorage(key) {
  try {
    const data = wx.getStorageSync(key)
    _cache[key] = Array.isArray(data) ? data : (data || (key === KEYS.APP_CONFIG ? {} : []))
    _loaded[key] = true
    return _cache[key]
  } catch (e) {
    console.error(`[storage] load(${key}) failed:`, e)
    _cache[key] = key === KEYS.APP_CONFIG ? {} : []
    _loaded[key] = true
    return _cache[key]
  }
}

function _ensureLoaded(key) {
  if (!_loaded[key]) return _loadFromStorage(key)
  return _cache[key]
}

function _saveToStorage(key) {
  try {
    wx.setStorageSync(key, _cache[key])
    _version++
  } catch (e) {
    console.error(`[storage] save(${key}) failed:`, e)
  }
}

// ─── 公开 API ───

/**
 * 获取缓存版本号（页面用此判断是否需要重新计算）
 */
function getVersion() {
  return _version
}

/**
 * 从内存缓存读取（不碰 Storage，零 I/O）
 * @param {String} key
 * @returns {Array|Object}
 */
function getCached(key) {
  return _ensureLoaded(key)
}

/**
 * 读取整个数组（首次从 Storage 加载，后续走缓存）
 */
function getAll(key) {
  return _ensureLoaded(key)
}

/**
 * 根据 id 查找单条
 */
function getById(key, id) {
  const list = _ensureLoaded(key)
  if (!Array.isArray(list)) return null
  return list.find(item => item.id === id) || null
}

/**
 * 添加一条记录
 */
function add(key, item) {
  try {
    const list = _ensureLoaded(key)
    list.push(item)
    _saveToStorage(key)
    return true
  } catch (e) {
    console.error(`[storage] add(${key}) failed:`, e)
    return false
  }
}

/**
 * 批量添加
 */
function addMany(key, items) {
  try {
    const list = _ensureLoaded(key)
    _cache[key] = list.concat(items)
    _saveToStorage(key)
    return true
  } catch (e) {
    console.error(`[storage] addMany(${key}) failed:`, e)
    return false
  }
}

/**
 * 根据 id 更新
 */
function update(key, id, data) {
  try {
    const list = _ensureLoaded(key)
    const index = list.findIndex(item => item.id === id)
    if (index === -1) return false
    list[index] = { ...list[index], ...data }
    _saveToStorage(key)
    return true
  } catch (e) {
    console.error(`[storage] update(${key}) failed:`, e)
    return false
  }
}

/**
 * 根据 id 删除
 */
function remove(key, id) {
  try {
    const list = _ensureLoaded(key)
    const filtered = list.filter(item => item.id !== id)
    if (filtered.length === list.length) return false
    _cache[key] = filtered
    _saveToStorage(key)
    return true
  } catch (e) {
    console.error(`[storage] remove(${key}) failed:`, e)
    return false
  }
}

/**
 * 批量删除
 */
function removeMany(key, predicate) {
  try {
    const list = _ensureLoaded(key)
    const before = list.length
    _cache[key] = list.filter(item => !predicate(item))
    _saveToStorage(key)
    return before - _cache[key].length
  } catch (e) {
    console.error(`[storage] removeMany(${key}) failed:`, e)
    return 0
  }
}

/**
 * 全量覆写
 */
function setAll(key, data) {
  try {
    _cache[key] = data
    _loaded[key] = true
    wx.setStorageSync(key, data)
    _version++
    return true
  } catch (e) {
    console.error(`[storage] setAll(${key}) failed:`, e)
    return false
  }
}

/**
 * 数据条数
 */
function count(key) {
  const data = _ensureLoaded(key)
  if (Array.isArray(data)) return data.length
  return 0
}

/**
 * 初始化（仅当数据为空时写入默认值）
 */
function initIfEmpty(key, defaultData) {
  const existing = _ensureLoaded(key)
  if (existing === null || existing === undefined ||
      (Array.isArray(existing) && existing.length === 0) ||
      (typeof existing === 'object' && !Array.isArray(existing) && Object.keys(existing).length === 0)) {
    _cache[key] = defaultData
    _loaded[key] = true
    try { wx.setStorageSync(key, defaultData) } catch (_) {}
    return true
  }
  return false
}

/**
 * Storage 使用情况
 */
function getStorageInfo() {
  try {
    const info = wx.getStorageInfoSync()
    return {
      used: info.currentSize * 1024,
      limit: info.limitSize * 1024,
      percent: info.limitSize > 0 ? Math.round((info.currentSize / info.limitSize) * 100) : 0
    }
  } catch (e) {
    return { used: 0, limit: 10 * 1024 * 1024, percent: 0 }
  }
}

/**
 * 获取 app_config 读写对象
 */
function getConfig(key) {
  return {
    get() {
      try { return _ensureLoaded(key) } catch (_) { return null }
    },
    set(value) {
      _cache[key] = value
      _loaded[key] = true
      try { wx.setStorageSync(key, value); _version++; return true } catch (_) { return false }
    }
  }
}

/**
 * 预热缓存：在 App.onLaunch 中调用，一次性加载所有常用 key
 */
function preload(keys) {
  keys.forEach(key => _ensureLoaded(key))
}

module.exports = {
  KEYS,
  getVersion,
  getCached,
  getAll,
  getById,
  add,
  addMany,
  update,
  remove,
  removeMany,
  setAll,
  count,
  initIfEmpty,
  getStorageInfo,
  getConfig,
  preload
}
