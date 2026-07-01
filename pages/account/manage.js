const app = getApp()
const storage = require('../../services/storage')
const calculator = require('../../services/calculator')
const { generateId, formatAmount } = require('../../utils/format')

Page({
  data: {
    accounts: [],
    newName: ''
  },

  onShow() {
    this.loadAccounts()
  },

  loadAccounts() {
    const transactions = app.globalData.transactions
    const rawAccounts = app.globalData.accounts
    const enriched = rawAccounts.map(a => {
      const balance = calculator.getAccountBalance(transactions, a.id)
      return { ...a, balance, balanceStr: formatAmount(Math.abs(balance), false) }
    })
    this.setData({ accounts: enriched })
  },

  onNameInput(e) {
    this.setData({ newName: e.detail.value })
  },

  onAdd() {
    const name = this.data.newName.trim()
    if (!name) return wx.showToast({ title: '请输入账户名称', icon: 'none' })

    storage.add(storage.KEYS.ACCOUNTS, { id: generateId('acct'), name, emoji: '💰', isPreset: false })
    app.refreshGlobalCache()
    wx.showToast({ title: '已添加', icon: 'success' })
    this.setData({ newName: '' })
    this.loadAccounts()
  },

  onDelete(e) {
    const { id, name } = e.currentTarget.dataset
    const linked = app.globalData.transactions.filter(tx => tx.accountId === id)
    if (linked.length > 0) {
      return wx.showModal({ title: '无法删除', content: `"${name}"账户下有 ${linked.length} 条账单，请先将这些账单转移后再删除`, showCancel: false, confirmColor: '#8D6E63' })
    }
    wx.showModal({
      title: `确定删除"${name}"？`,
      content: '删除后无法恢复',
      confirmColor: '#FF8A80',
      success: (res) => {
        if (res.confirm) {
          storage.remove(storage.KEYS.ACCOUNTS, id)
          app.refreshGlobalCache()
          this.loadAccounts()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
