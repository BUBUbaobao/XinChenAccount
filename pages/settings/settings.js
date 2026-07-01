const app = getApp()
const storage = require('../../services/storage')
const constants = require('../../utils/constants')

Page({
  data: {
    totalRecords: 0,
    storagePercent: 0
  },

  onShow() {
    this.setData({
      totalRecords: app.globalData.transactions.length,
      storagePercent: storage.getStorageInfo().percent
    })
  },

  onNavTo(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  onClearData() {
    wx.showModal({
      title: '危险操作',
      content: '输入"确认清空"四个字来确认',
      editable: true,
      placeholderText: '请输入确认清空',
      confirmColor: '#FF8A80',
      success: (res) => {
        if (res.confirm && res.content === '确认清空') {
          storage.setAll(storage.KEYS.TRANSACTIONS, [])
          storage.setAll(storage.KEYS.PARSE_LOGS, [])
          storage.setAll(storage.KEYS.BUDGETS, [])
          storage.setAll(storage.KEYS.AI_REPORTS, [])
          storage.initIfEmpty(storage.KEYS.CATEGORIES, constants.PRESET_CATEGORIES)
          storage.initIfEmpty(storage.KEYS.ACCOUNTS, constants.PRESET_ACCOUNTS)
          storage.initIfEmpty(storage.KEYS.RULES, constants.PRESET_RULES)
          storage.setAll(storage.KEYS.APP_CONFIG, constants.DEFAULT_APP_CONFIG)
          app.refreshGlobalCache()
          wx.showToast({ title: '已清空', icon: 'success' })
          this.onShow()
        } else if (res.confirm && res.content !== '确认清空') {
          wx.showToast({ title: '输入不正确', icon: 'none' })
        }
      }
    })
  }
})
