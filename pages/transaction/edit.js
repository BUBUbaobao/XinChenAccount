const app = getApp()
const storage = require('../../services/storage')
const { formatAmount, formatDate } = require('../../utils/format')

Page({
  data: {
    id: '',
    transaction: null,
    source: 'manual',
    type: 'expense',

    // 金额（数字键盘，始终可见）
    amountStr: '',
    amount: 0,
    displayAmount: '0',

    // 键盘
    keypadRows: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['.', '0', '⌫']
    ],

    // 分类/账户
    categoryNames: [],
    categoryIndex: 0,
    categories: [],
    accountNames: [],
    accountIndex: 0,
    accounts: [],
    note: '',
    description: '',
    dateValue: '',
    dateLabel: '',
    timestamp: Date.now()
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const tx = storage.getById(storage.KEYS.TRANSACTIONS, options.id)
    if (!tx) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const categories = app.globalData.categories
    const accounts = app.globalData.accounts
    const catIndex = categories.findIndex(c => c.id === tx.categoryId)
    const acctIndex = accounts.findIndex(a => a.id === tx.accountId)

    const absAmount = Math.abs(tx.amount)
    const amountStr = absAmount.toFixed(2).replace(/\.?0+$/, '')

    this.setData({
      id: tx.id,
      transaction: tx,
      source: tx.source,
      type: tx.type,
      amountStr: amountStr,
      amount: absAmount,
      displayAmount: amountStr || '0',
      categories,
      categoryNames: categories.map(c => `${c.emoji} ${c.name}`),
      categoryIndex: catIndex >= 0 ? catIndex : 0,
      accounts,
      accountNames: accounts.map(a => `${a.emoji} ${a.name}`),
      accountIndex: acctIndex >= 0 ? acctIndex : 0,
      note: tx.note || '',
      description: tx.description || '',
      dateValue: formatDate(tx.timestamp),
      dateLabel: formatDate(tx.timestamp),
      timestamp: tx.timestamp
    })
  },

  // ─── 数字键盘 ───
  onKeyTap(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return

    let { amountStr } = this.data

    if (key === '⌫') {
      amountStr = amountStr.slice(0, -1)
    } else if (key === '.') {
      if (amountStr === '') amountStr = '0.'
      else if (!amountStr.includes('.')) amountStr += '.'
    } else {
      if (amountStr === '0' && key !== '.') {
        amountStr = key
      } else if (amountStr.indexOf('.') !== -1) {
        const decimalPart = amountStr.split('.')[1]
        if (decimalPart && decimalPart.length >= 2) return
        amountStr += key
      } else {
        if (amountStr.replace('.', '').length >= 8) return
        amountStr += key
      }
    }

    let amount = 0
    if (amountStr !== '' && amountStr !== '.') {
      amount = parseFloat(amountStr) || 0
    }

    this.setData({
      amountStr,
      amount,
      displayAmount: amountStr === '' ? '0' : amountStr
    })
  },

  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type })
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: parseInt(e.detail.value) })
  },

  onAccountChange(e) {
    this.setData({ accountIndex: parseInt(e.detail.value) })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onDateChange(e) {
    const dateStr = e.detail.value
    const d = new Date(dateStr)
    this.setData({
      dateValue: dateStr,
      dateLabel: dateStr,
      timestamp: d.getTime()
    })
  },

  onSave() {
    if (this._saving) return
    this._saving = true
    const { id, amount, type, categories, categoryIndex, accounts, accountIndex, note, description, timestamp } = this.data
    if (amount === 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      this._saving = false
      return
    }

    const category = categories[categoryIndex]
    const account = accounts[accountIndex]

    storage.update(storage.KEYS.TRANSACTIONS, id, {
      amount: Math.round(amount * 100) / 100,
      type,
      categoryId: category ? category.id : '',
      categoryName: category ? category.name : '',
      accountId: account ? account.id : '',
      accountName: account ? account.name : '',
      description: note ? note.substring(0, 20) : (description || (category ? category.name : '')),
      note: note || null,
      timestamp
    })

    app.refreshGlobalCache()
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1000)
  }
})
