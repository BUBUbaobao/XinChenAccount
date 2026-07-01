const storage = require('../../services/storage')
const calculator = require('../../services/calculator')
const { generateId, getCurrentMonth } = require('../../utils/format')

const app = getApp()

Page({
  data: {
    budgetList: [],       // 各分类预算行（含已用/预算/百分比）
    totalBudget: 0,       // 总预算金额
    totalUsed: 0,         // 当月总支出
    totalPercent: 0,      // 总预算使用百分比
    monthLabel: '',
    showModal: false,
    editingItem: null,    // { categoryId, categoryName, categoryEmoji, isTotal }
    editAmount: ''
  },

  _lastVersion: -1,

  onLoad() {
    this._refresh()
  },

  onShow() {
    const v = app.globalData.dataVersion
    if (v === this._lastVersion) return
    this._lastVersion = v
    this._refresh()
  },

  _refresh() {
    const month = getCurrentMonth()
    const transactions = app.globalData.transactions
    const budgets = app.globalData.budgets
    const cats = app.globalData.categories
    const catMap = app.globalData._catMap

    // 当月总支出
    const summary = calculator.getMonthlySummary(transactions, month)
    const totalExpense = summary.expense

    // 总预算（categoryId 为 null 的 budget）
    const totalBudgetItem = budgets.find(b => b.month === month && b.categoryId === null)
    const totalBudget = totalBudgetItem ? totalBudgetItem.amount : 0

    // 各分类预算
    const budgetList = new Array(cats.length)
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i]
      const budgetItem = budgets.find(b => b.month === month && b.categoryId === cat.id)
      const budgetAmount = budgetItem ? budgetItem.amount : 0
      const result = calculator.checkBudget(transactions, budgets, cat.id, month)
      budgetList[i] = {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.emoji,
        budget: budgetAmount,
        used: result.used,
        percent: result.percent,
        exceeded: result.exceeded
      }
    }

    const now = new Date()
    this.setData({
      budgetList,
      totalBudget,
      totalUsed: totalExpense,
      totalPercent: totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0,
      monthLabel: now.getFullYear() + '年' + (now.getMonth() + 1) + '月'
    })
  },

  // ─── 修改预算 ───

  onEditBudget(e) {
    const { id, name, emoji, istotal } = e.currentTarget.dataset
    if (istotal === true || istotal === 'true') {
      this.setData({
        showModal: true,
        editingItem: { categoryId: null, categoryName: '总预算', categoryEmoji: '🎯', isTotal: true },
        editAmount: this.data.totalBudget ? String(this.data.totalBudget) : ''
      })
    } else {
      const item = this.data.budgetList.find(b => b.categoryId === id)
      this.setData({
        showModal: true,
        editingItem: { categoryId: id, categoryName: name, categoryEmoji: emoji, isTotal: false },
        editAmount: item && item.budget ? String(item.budget) : ''
      })
    }
  },

  onAmountInput(e) {
    this.setData({ editAmount: e.detail.value })
  },

  onSaveBudget() {
    const amount = parseInt(this.data.editAmount)
    if (isNaN(amount) || amount < 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const { editingItem } = this.data
    const month = getCurrentMonth()
    const budgets = app.globalData.budgets

    // 查找已有预算项
    const existing = budgets.find(b =>
      b.month === month && b.categoryId === editingItem.categoryId
    )

    if (amount === 0 && existing) {
      // 金额为0则删除预算
      storage.remove(storage.KEYS.BUDGETS, existing.id)
    } else if (amount > 0) {
      if (existing) {
        storage.update(storage.KEYS.BUDGETS, existing.id, { amount })
      } else {
        storage.add(storage.KEYS.BUDGETS, {
          id: generateId('budget'),
          categoryId: editingItem.categoryId,
          amount,
          month
        })
      }
    }

    app.refreshGlobalCache()
    this._lastVersion = app.globalData.dataVersion
    this.setData({ showModal: false, editingItem: null })
    this._refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onCloseModal() {
    this.setData({ showModal: false, editingItem: null })
  }
})
