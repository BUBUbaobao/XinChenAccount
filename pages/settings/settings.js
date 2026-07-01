const app = getApp()
const storage = require('../../services/storage')
const constants = require('../../utils/constants')
const exportService = require('../../services/export')
const ai = require('../../services/ai')

Page({
  data: {
    totalRecords: 0,
    storagePercent: 0,
    aiMode: 'local',
    apiKeyInput: '',
    showKey: false
  },

  onShow() {
    const config = app.globalData.config || {}
    let apiKeyInput = ''
    if (config.apiKey) {
      const decrypted = ai.decryptKey(config.apiKey)
      apiKeyInput = decrypted || ''
    }

    this.setData({
      totalRecords: app.globalData.transactions.length,
      storagePercent: storage.getStorageInfo().percent,
      aiMode: config.aiMode || 'local',
      apiKeyInput
    })
  },

  onNavTo(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  // ─── CSV 导出 ───

  onExportCSV() {
    const txs = app.globalData.transactions
    if (txs.length === 0) {
      wx.showToast({ title: '暂无数据可导出', icon: 'none' })
      return
    }

    wx.showLoading({ title: '生成中...' })
    try {
      const csv = exportService.exportToCSV(txs)
      const now = new Date()
      const fileName = '昕辰记账_导出_' +
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '.csv'

      // 尝试分享文件
      const fs = wx.getFileSystemManager()
      const filePath = wx.env.USER_DATA_PATH + '/' + fileName
      fs.writeFileSync(filePath, csv, 'utf8')

      wx.hideLoading()
      wx.shareFileMessage({
        filePath,
        fileName,
        success() {
          wx.showToast({ title: '已发送', icon: 'success' })
        },
        fail() {
          // fallback: 复制到剪贴板
          wx.setClipboardData({
            data: csv,
            success() {
              wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
            }
          })
        }
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '导出失败', icon: 'none' })
    }
  },

  // ─── CSV 导入 ───

  onImportCSV() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const filePath = res.tempFiles[0].path
        const fs = wx.getFileSystemManager()
        try {
          const content = fs.readFileSync(filePath, 'utf8')
          const result = exportService.importFromCSV(
            content, app.globalData.transactions,
            app.globalData.categories,
            app.globalData.accounts
          )

          if (result.success === 0 && result.skip === 0) {
            wx.showToast({ title: '未识别到有效数据', icon: 'none' })
            return
          }

          if (result.success > 0 && result.newTxs) {
            storage.addMany(storage.KEYS.TRANSACTIONS, result.newTxs)
            app.refreshGlobalCache()
          }

          wx.showModal({
            title: '导入完成',
            content: `成功导入 ${result.success} 条记录\n跳过 ${result.skip} 条重复记录`,
            showCancel: false,
            confirmText: '知道了'
          })
        } catch (e) {
          wx.showToast({ title: '文件读取失败', icon: 'none' })
        }
      },
      fail: () => {
        // 用户取消选择
      }
    })
  },

  // ─── AI 设置 ───

  onAIModeToggle(e) {
    const mode = e.detail.value ? 'cloud' : 'local'
    const config = { ...app.globalData.config, aiMode: mode }

    // 切换前检查 API Key
    if (mode === 'cloud' && !this.data.apiKeyInput) {
      this.setData({ aiMode: 'cloud' })
      wx.showToast({ title: '请先输入 API Key', icon: 'none' })
      config.aiMode = 'cloud'
    }

    storage.setAll(storage.KEYS.APP_CONFIG, config)
    app.refreshGlobalCache()
    this.setData({ aiMode: mode })
  },

  onApiKeyInput(e) {
    const val = e.detail.value
    this.setData({ apiKeyInput: val })
    // 实时加密保存
    const encrypted = val ? ai.encryptKey(val) : null
    const config = { ...app.globalData.config, apiKey: encrypted }
    storage.setAll(storage.KEYS.APP_CONFIG, config)
    app.refreshGlobalCache()
  },

  onToggleKeyVisible() {
    this.setData({ showKey: !this.data.showKey })
  },

  onGuide() {
    wx.showModal({
      title: '📋 使用指引',
      content: '1. 在微信中长按支付消息 → 复制\n\n2. 打开"昕辰记账"小程序\n\n3. 首页自动弹出确认横幅\n   点击即可一键记账\n\n💡 也可以手动打开记账弹层\n   点击「📋 粘贴识别」按钮',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onAbout() {
    wx.showModal({
      title: '昕辰记账 v1.0.0',
      content: '个人本地记账工具\n\n技术栈：微信小程序原生框架\nCanvas 2D + View 图表\nDeepSeek AI 流式对话\n\n所有数据 100% 本地存储\n无需网络即可记账',
      showCancel: false,
      confirmText: '知道了'
    })
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
