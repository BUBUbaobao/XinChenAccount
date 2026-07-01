const calculator = require('../../services/calculator')

const app = getApp()

Page({
  data: {
    keyword: '',
    typeFilter: 'all',        // 'all' | 'expense' | 'income'
    categoryId: '',
    categoryIndex: 0,
    categoryNames: ['全部'],
    categoryIds: [''],
    dateStart: '',
    dateEnd: '',
    dateStartLabel: '开始日期',
    dateEndLabel: '结束日期',
    amountMin: '',
    amountMax: '',
    showFilters: false,

    results: [],
    total: 0,
    hasMore: false,
    page: 1,
    searched: false
  },

  onLoad() {
    this._initCategories()
  },

  _initCategories() {
    const cats = app.globalData.categories
    this.setData({
      categoryNames: ['全部', ...cats.map(c => c.emoji + ' ' + c.name)],
      categoryIds: ['', ...cats.map(c => c.id)]
    })
  },

  // ─── 搜索 ───

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    this.setData({ page: 1, results: [] })
    this._executeSearch(1)
  },

  onSearchTap() {
    this.setData({ page: 1, results: [] })
    this._executeSearch(1)
  },

  _buildFilters() {
    return {
      keyword: this.data.keyword.trim(),
      dateStart: this.data.dateStart ? new Date(this.data.dateStart).getTime() : 0,
      dateEnd: this.data.dateEnd ? new Date(this.data.dateEnd + ' 23:59:59').getTime() : 0,
      amountMin: parseFloat(this.data.amountMin) || 0,
      amountMax: parseFloat(this.data.amountMax) || 0,
      categoryId: this.data.categoryId,
      type: this.data.typeFilter
    }
  },

  _executeSearch(p) {
    const catMap = app.globalData._catMap
    const result = calculator.searchTransactions(
      app.globalData.transactions,
      this._buildFilters(),
      p || 1,
      20
    )

    const list = new Array(result.list.length)
    for (let i = 0; i < result.list.length; i++) {
      const tx = result.list[i]
      list[i] = { ...tx, categoryEmoji: (catMap[tx.categoryId] || {}).emoji || '📦' }
    }

    this.setData({
      results: p === 1 ? list : [...this.data.results, ...list],
      total: result.total,
      hasMore: result.hasMore,
      page: p || 1,
      searched: true
    })
  },

  onReachBottom() {
    if (!this.data.hasMore) return
    this._executeSearch(this.data.page + 1)
  },

  // ─── 筛选条件 ───

  onToggleFilters() {
    this.setData({ showFilters: !this.data.showFilters })
  },

  onTypeFilter(e) {
    this.setData({ typeFilter: e.currentTarget.dataset.type })
  },

  onCategoryPick(e) {
    const idx = parseInt(e.detail.value)
    this.setData({
      categoryIndex: idx,
      categoryId: this.data.categoryIds[idx]
    })
  },

  onDateStartChange(e) {
    this.setData({
      dateStart: e.detail.value,
      dateStartLabel: e.detail.value || '开始日期'
    })
  },

  onDateEndChange(e) {
    this.setData({
      dateEnd: e.detail.value,
      dateEndLabel: e.detail.value || '结束日期'
    })
  },

  onAmountMinInput(e) {
    this.setData({ amountMin: e.detail.value })
  },

  onAmountMaxInput(e) {
    this.setData({ amountMax: e.detail.value })
  },

  onReset() {
    this.setData({
      keyword: '', typeFilter: 'all', categoryId: '', categoryIndex: 0,
      dateStart: '', dateEnd: '',
      dateStartLabel: '开始日期', dateEndLabel: '结束日期',
      amountMin: '', amountMax: '',
      results: [], total: 0, hasMore: false, page: 1, searched: false
    })
  },

  // ─── 点击记录 ───

  onRecordTap(e) {
    const id = e.currentTarget.dataset.id || (e.detail && e.detail.id)
    if (!id) return
    wx.navigateTo({ url: '/pages/transaction/edit?id=' + id })
  }
})
