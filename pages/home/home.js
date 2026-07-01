const calculator = require('../../services/calculator')
const storage = require('../../services/storage')
const { getCurrentMonth, formatMonthLabel, formatAmount } = require('../../utils/format')
const { PAGE_SIZE } = require('../../utils/constants')

const app = getApp()

Page({
  data: {
    currentMonth: '', currentMonthLabel: '', recordedDays: 0,
    summary: { income: 0, expense: 0, balance: 0 },
    balanceAbs: '0.00', incomeStr: '0.00', expenseStr: '0.00',
    todaySummary: null, todayHasData: false,
    transactions: [], page: 1, hasMore: true, ready: false,
    swipeOffsets: {}, swipeTransition: {}, swipedId: ''
  },

  _catMap: null, _lastMonth: '', _lastVersion: -1,
  _touchStartX: 0, _swipingId: null, _isSwiping: false,

  onLoad() {
    this._catMap = app.globalData._catMap
    this.fullRefresh()
  },

  onShow() {
    const v = app.globalData.dataVersion
    const m = getCurrentMonth()
    if (v === this._lastVersion && m === this._lastMonth) return
    this.lightRefresh()
  },

  onPullDownRefresh() { this.fullRefresh(); wx.stopPullDownRefresh() },
  onReachBottom() { this.loadMore() },

  // ═══════════════ 数据加载 ═══════════════

  _refresh(month) {
    const data = calculator.getHomeData(app.globalData.transactions, month, this._catMap, PAGE_SIZE)
    this.setData({
      currentMonth: month,
      currentMonthLabel: formatMonthLabel(month),
      recordedDays: data.recordedDays,
      summary: data.summary,
      balanceAbs: formatAmount(Math.abs(data.summary.balance), false),
      incomeStr: formatAmount(data.summary.income, false),
      expenseStr: formatAmount(data.summary.expense, false),
      todaySummary: data.today,
      todayHasData: data.today.topCategories.length > 0,
      transactions: data.transactions,
      page: 1,
      hasMore: data.hasMore,
      swipeOffsets: {}, swipeTransition: {}, swipedId: '',
      ready: true
    })
    this._lastMonth = month
    this._lastVersion = app.globalData.dataVersion
  },

  fullRefresh() { this._refresh(getCurrentMonth()) },
  lightRefresh() { this._refresh(getCurrentMonth()) },

  loadMore() {
    if (!this.data.hasMore) return
    const next = this.data.page + 1
    const paged = calculator.getPagedTransactions(app.globalData.transactions, this.data.currentMonth, next, PAGE_SIZE)
    const list = new Array(paged.list.length)
    for (let i = 0; i < paged.list.length; i++) {
      const tx = paged.list[i]
      list[i] = { ...tx, categoryEmoji: (this._catMap[tx.categoryId] || {}).emoji || '📦' }
    }
    this.setData({
      transactions: [...this.data.transactions, ...list],
      page: next, hasMore: paged.hasMore
    })
  },

  // ═══════════════ FAB / 记账 ═══════════════

  onFabTap() {
    this.closeAllSwipes()
    const sheet = this.selectComponent('#addSheet')
    if (sheet) sheet.open({ type: 'expense' })
  },
  onSheetClose() { app.notifyDataChange(); this.fullRefresh() },
  onSaved() {},

  // ═══════════════ 记录 / 搜索 ═══════════════

  onRecordTap(e) {
    const id = e.currentTarget.dataset.id || (e.detail && e.detail.id)
    if (!id) return
    if (this.data.swipedId === id) { this.closeAllSwipes(); return }
    wx.navigateTo({ url: '/pages/transaction/edit?id=' + id })
  },
  onSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
  onViewAll() { wx.navigateTo({ url: '/pages/search/index' }) },

  // ═══════════════ 左滑删除 ═══════════════

  _rpxToPx(r) { return (r / 750) * wx.getSystemInfoSync().windowWidth },

  onItemTouchStart(e) {
    const id = e.currentTarget.dataset.id
    this._closeOthers(id)
    this._touchStartX = e.touches[0].clientX
    this._currentOffset = this.data.swipeOffsets[id] || 0
    this._swipingId = id; this._isSwiping = false
    this.setData({ ['swipeTransition.' + id]: false })
  },

  onItemTouchMove(e) {
    if (!this._swipingId) return
    const id = this._swipingId, dx = e.touches[0].clientX - this._touchStartX
    if (!this._isSwiping) { if (Math.abs(dx) > 10) this._isSwiping = true; else return }
    let offset = this._currentOffset + dx
    const maxPx = this._rpxToPx(120)
    if (offset > 0) offset *= 0.2
    else if (offset < -maxPx) offset = -maxPx + (offset + maxPx) * 0.2
    this.setData({ ['swipeOffsets.' + id]: offset })
  },

  onItemTouchEnd() {
    if (!this._swipingId) return
    const id = this._swipingId
    const offset = this.data.swipeOffsets[id] || 0
    const threshold = this._rpxToPx(120) * 0.4
    const upd = { ['swipeTransition.' + id]: true }
    if (offset < -threshold) {
      upd[['swipeOffsets.' + id]] = -this._rpxToPx(120)
      upd.swipedId = id
    } else {
      upd[['swipeOffsets.' + id]] = 0
      upd.swipedId = ''
    }
    this.setData(upd)
    this._swipingId = null; this._isSwiping = false
  },

  _closeOthers(exceptId) {
    const sid = this.data.swipedId
    if (sid && sid !== exceptId) this.setData({ ['swipeOffsets.' + sid]: 0, ['swipeTransition.' + sid]: true, swipedId: '' })
  },

  closeAllSwipes() {
    const sid = this.data.swipedId
    if (sid) this.setData({ ['swipeOffsets.' + sid]: 0, ['swipeTransition.' + sid]: true, swipedId: '' })
  },

  onListTap() { this.closeAllSwipes() },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确定删除这条记录？', content: '删除后无法恢复', confirmColor: '#FF8A80',
      success: (res) => {
        if (res.confirm) {
          storage.remove(storage.KEYS.TRANSACTIONS, id)
          app.notifyDataChange(); this.fullRefresh()
          wx.showToast({ title: '已删除', icon: 'success', duration: 1500 })
        }
      }
    })
  }
})
