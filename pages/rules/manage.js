const storage = require('../../services/storage')
const { generateId } = require('../../utils/format')

const app = getApp()

Page({
  data: {
    rules: [],
    categoryNames: [],
    categoryIds: [],
    selectedCategoryIndex: 0,
    selectedCategoryId: '',
    keyword: '',
    showForm: false
  },

  _lastVersion: -1,

  onLoad() {
    this._initCategories()
    this._refresh()
  },

  onShow() {
    const v = app.globalData.dataVersion
    if (v === this._lastVersion) return
    this._lastVersion = v
    this._initCategories()
    this._refresh()
  },

  _initCategories() {
    const cats = app.globalData.categories
    this.setData({
      categoryNames: cats.map(c => c.emoji + ' ' + c.name),
      categoryIds: cats.map(c => c.id)
    })
    if (!this.data.selectedCategoryId && cats.length > 0) {
      this.setData({ selectedCategoryId: cats[0].id, selectedCategoryIndex: 0 })
    }
  },

  _refresh() {
    const rules = app.globalData.rules
    const catMap = app.globalData._catMap
    const enriched = new Array(rules.length)
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]
      const cat = catMap[r.categoryId] || {}
      enriched[i] = {
        ...r,
        categoryName: cat.name || '未知',
        categoryEmoji: cat.emoji || '📦'
      }
    }
    // 自定义排在前面
    enriched.sort((a, b) => (a.isPreset ? 1 : 0) - (b.isPreset ? 1 : 0))
    this.setData({ rules: enriched })
  },

  // ─── 添加规则 ───

  onToggleForm() {
    this.setData({ showForm: !this.data.showForm })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onCategoryPick(e) {
    const idx = parseInt(e.detail.value)
    this.setData({
      selectedCategoryIndex: idx,
      selectedCategoryId: this.data.categoryIds[idx]
    })
  },

  onAdd() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }
    if (!this.data.selectedCategoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    // 查重
    const exists = app.globalData.rules.some(r => r.keyword === keyword)
    if (exists) {
      wx.showToast({ title: '该关键词已存在', icon: 'none' })
      return
    }

    storage.add(storage.KEYS.RULES, {
      id: generateId('rule'),
      keyword,
      categoryId: this.data.selectedCategoryId,
      isPreset: false,
      enabled: true
    })
    app.refreshGlobalCache()
    this.setData({ keyword: '', showForm: false })
    this._lastVersion = app.globalData.dataVersion
    this._refresh()
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  // ─── 开关启用/禁用 ───

  onToggle(e) {
    const id = e.currentTarget.dataset.id
    const enabled = e.detail.value   // switch 组件传递
    storage.update(storage.KEYS.RULES, id, { enabled })
    app.refreshGlobalCache()
    // 原地更新避免全量刷新闪烁
    const rules = this.data.rules.map(r =>
      r.id === id ? { ...r, enabled } : r
    )
    this.setData({ rules })
    this._lastVersion = app.globalData.dataVersion
  },

  // ─── 长按删除 ───

  onLongPress(e) {
    const { id, keyword, isPreset } = e.currentTarget.dataset
    if (isPreset === true || isPreset === 'true') {
      wx.showToast({ title: '预置规则不可删除', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除规则',
      content: `确定删除关键词「${keyword}」？`,
      confirmColor: '#FF8A80',
      success: (res) => {
        if (res.confirm) {
          storage.remove(storage.KEYS.RULES, id)
          app.refreshGlobalCache()
          this._lastVersion = app.globalData.dataVersion
          this._refresh()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
