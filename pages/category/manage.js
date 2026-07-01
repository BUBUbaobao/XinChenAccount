const app = getApp()
const storage = require('../../services/storage')
const { generateId } = require('../../utils/format')

Page({
  data: {
    categories: [],
    newName: '',
    newEmoji: ''
  },

  onShow() {
    this.setData({ categories: app.globalData.categories })
  },

  onNameInput(e) { this.setData({ newName: e.detail.value }) },
  onEmojiInput(e) { this.setData({ newEmoji: e.detail.value }) },

  onAdd() {
    const name = this.data.newName.trim()
    if (!name) return wx.showToast({ title: '请输入分类名称', icon: 'none' })
    const emoji = this.data.newEmoji.trim() || '📦'
    const maxOrder = app.globalData.categories.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0)

    storage.add(storage.KEYS.CATEGORIES, { id: generateId('cat'), name, emoji, isPreset: false, sortOrder: maxOrder + 1 })
    app.refreshGlobalCache()
    wx.showToast({ title: '已添加', icon: 'success' })
    this.setData({ newName: '', newEmoji: '', categories: app.globalData.categories })
  },

  onDelete(e) {
    const { id, name } = e.currentTarget.dataset
    const linked = app.globalData.transactions.filter(tx => tx.categoryId === id)
    if (linked.length > 0) {
      return wx.showModal({ title: '无法删除', content: `"${name}"分类下有 ${linked.length} 条账单，请先将这些账单重新归类后再删除`, showCancel: false, confirmColor: '#8D6E63' })
    }
    wx.showModal({
      title: `确定删除"${name}"？`, content: '删除后无法恢复', confirmColor: '#FF8A80',
      success: (res) => {
        if (res.confirm) {
          storage.remove(storage.KEYS.CATEGORIES, id)
          app.refreshGlobalCache()
          this.setData({ categories: app.globalData.categories })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
