/**
 * 昕辰记账 - 小程序入口
 */
const storage = require('./services/storage')
const constants = require('./utils/constants')

App({
  onLaunch(options) {
    // 1. 预热缓存：一次性加载所有常用 key 到内存
    storage.preload([
      storage.KEYS.TRANSACTIONS,
      storage.KEYS.CATEGORIES,
      storage.KEYS.ACCOUNTS,
      storage.KEYS.RULES,
      storage.KEYS.BUDGETS,
      storage.KEYS.APP_CONFIG
    ])

    // 2. 初始化预置数据
    this.initPresetData()

    // 3. 将缓存引用挂到 globalData（页面直接读，不走 I/O）
    this.refreshGlobalCache()

    // 4. 转发消息入口（P2）
    this.handleForwardMessage(options)
  },

  onShow(options) {
    // 自动检测剪贴板中的支付消息
    this.checkClipboard()
  },

  /**
   * 自动检测剪贴板，识别支付消息后存储到 globalData
   * 首页可读取 pendingPasteData 展示快速确认条
   */
  checkClipboard() {
    // 仅在首页 Tab 时检测，避免每个 Tab 切换都弹权限
    const pages = getCurrentPages()
    if (pages.length === 0) return
    const route = pages[pages.length - 1].route
    if (route !== 'pages/home/home') return

    const parser = require('./services/parser')
    wx.getClipboardData({
      success(res) {
        const text = res.data || ''
        // 仅当剪贴板包含支付凭证特征时才触发
        if (!text.includes('支付') && !text.includes('¥') && !text.includes('￥')) return
        const result = parser.parse(text)
        if (result.success) {
          // 防止同一内容重复弹
          const app = getApp()
          if (app.globalData._lastClipText === text) return
          app.globalData._lastClipText = text
          app.globalData.pendingPasteData = result
        }
      },
      fail() {}
    })
  },

  initPresetData() {
    storage.initIfEmpty(storage.KEYS.CATEGORIES, constants.PRESET_CATEGORIES)
    storage.initIfEmpty(storage.KEYS.ACCOUNTS, constants.PRESET_ACCOUNTS)
    storage.initIfEmpty(storage.KEYS.RULES, constants.PRESET_RULES)
    storage.initIfEmpty(storage.KEYS.TRANSACTIONS, [])
    storage.initIfEmpty(storage.KEYS.PARSE_LOGS, [])
    storage.initIfEmpty(storage.KEYS.BUDGETS, [])
    storage.initIfEmpty(storage.KEYS.AI_REPORTS, [])
    storage.initIfEmpty(storage.KEYS.APP_CONFIG, constants.DEFAULT_APP_CONFIG)
  },

  /**
   * 刷新 globalData 中的缓存引用
   * 页面通过 app.globalData 直接读取，零 Storage I/O
   */
  refreshGlobalCache() {
    this.globalData.transactions = storage.getCached(storage.KEYS.TRANSACTIONS)
    this.globalData.categories  = storage.getCached(storage.KEYS.CATEGORIES)
    this.globalData.accounts    = storage.getCached(storage.KEYS.ACCOUNTS)
    this.globalData.rules       = storage.getCached(storage.KEYS.RULES)
    this.globalData.budgets     = storage.getCached(storage.KEYS.BUDGETS)
    this.globalData.parse_logs  = storage.getCached(storage.KEYS.PARSE_LOGS)
    this.globalData.config      = storage.getCached(storage.KEYS.APP_CONFIG)
    this.globalData.dataVersion = storage.getVersion()

    // 预构建分类映射 { id → { id, name, emoji, ... } }
    const catMap = {}
    const cats = this.globalData.categories
    if (cats) for (let i = 0; i < cats.length; i++) catMap[cats[i].id] = cats[i]
    this.globalData._catMap = catMap
  },

  /**
   * 数据变更后调用：刷新缓存 + 通知页面
   */
  notifyDataChange() {
    this.refreshGlobalCache()
    this.globalData.dataVersion = storage.getVersion()
  },

  handleForwardMessage(options) {
    const referrerInfo = options.referrerInfo || {}
    if (referrerInfo.extraData && referrerInfo.extraData.message) {
      this.globalData.pendingForwardData = {
        rawText: referrerInfo.extraData.message,
        timestamp: Date.now()
      }
    }
  },

  globalData: {
    transactions: [],
    categories: [],
    accounts: [],
    rules: [],
    budgets: [],
    parse_logs: [],
    config: null,
    dataVersion: 0,
    pendingForwardData: null,
    pendingPasteData: null,
    _lastClipText: ''
  }
})
