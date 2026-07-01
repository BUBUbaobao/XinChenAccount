const app = getApp()
const storage = require('../../services/storage')
const { generateId, formatDate } = require('../../utils/format')

Component({
  data: {
    visible: false,
    type: 'expense',           // 'expense' | 'income'
    categories: [],
    selectedCategoryId: '',
    amountStr: '',             // 输入字符串，如 "123"
    amount: 0,                 // 数值（元）
    displayAmount: '0',        // 显示字符串

    // 可选
    showExtra: false,
    note: '',
    accountNames: [],
    accountIndex: 0,
    accounts: [],
    dateValue: '',             // picker 用的 yyyy-MM-dd
    dateLabel: '今天',
    timestamp: Date.now(),

    // 键盘布局
    keypadRows: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['.', '0', '⌫']
    ],

    // 保存成功动画
    saved: false,
    animatingAmount: false
  },

  lifetimes: {
    attached() {
      this.refreshData()
    }
  },

  pageLifetimes: {
    show() {
      this.refreshData()
    }
  },

  methods: {
    /**
     * 刷新分类和账户数据
     */
    refreshData() {
      // 从全局缓存读取（零 I/O）
      const categories = app.globalData.categories
      const accounts = app.globalData.accounts
      this.setData({
        categories,
        accounts,
        accountNames: accounts.map(a => `${a.emoji} ${a.name}`),
        selectedCategoryId: categories.length > 0 ? categories[0].id : '',
        accountIndex: 0,
        dateValue: formatDate(Date.now()),
        dateLabel: '今天'
      })
    },

    /**
     * 打开半弹层
     */
    open(data) {
      this.refreshData()
      const now = Date.now()
      this.setData({
        visible: true,
        type: (data && data.type) || 'expense',
        selectedCategoryId: (data && data.categoryId) || (this.data.categories[0] ? this.data.categories[0].id : ''),
        amountStr: '',
        amount: 0,
        displayAmount: '0',
        showExtra: false,
        note: (data && data.note) || '',
        accountIndex: 0,
        dateValue: formatDate(now),
        dateLabel: '今天',
        timestamp: now,
        saved: false
      })
    },

    /**
     * 关闭半弹层
     */
    onClose() {
      this.setData({ visible: false })
      this.triggerEvent('close')
    },

    noop() {},

    /**
     * 切换支出/收入
     */
    switchType(e) {
      this.setData({ type: e.currentTarget.dataset.type })
    },

    /**
     * 选择分类
     */
    selectCategory(e) {
      this.setData({ selectedCategoryId: e.currentTarget.dataset.id })
    },

    /**
     * 数字键盘输入
     */
    onKeyTap(e) {
      const key = e.currentTarget.dataset.key
      if (!key) return

      let { amountStr } = this.data

      if (key === '⌫') {
        amountStr = amountStr.slice(0, -1)
      } else if (key === '.') {
        // 不能以 . 开头，不能有多个 .
        if (amountStr === '') amountStr = '0.'
        else if (!amountStr.includes('.')) amountStr += '.'
      } else {
        // 首位不能是0（除非后面是小数点）
        if (amountStr === '0' && key !== '.') {
          amountStr = key
        } else if (amountStr.indexOf('.') !== -1) {
          // 小数部分最多两位
          const decimalPart = amountStr.split('.')[1]
          if (decimalPart && decimalPart.length >= 2) return
          amountStr += key
        } else {
          // 最多8位整数
          if (amountStr.replace('.', '').length >= 8) return
          amountStr += key
        }
      }

      // 计算数值
      let amount = 0
      if (amountStr !== '' && amountStr !== '.') {
        amount = parseFloat(amountStr) || 0
      }

      const displayAmount = amountStr === '' ? '0' : amountStr

      this.setData({ amountStr, amount, displayAmount })
    },

    /**
     * 展开/折叠更多信息
     */
    toggleExtra() {
      this.setData({ showExtra: !this.data.showExtra })
    },

    /**
     * 备注输入
     */
    onNoteInput(e) {
      this.setData({ note: e.detail.value })
    },

    /**
     * 账户选择
     */
    onAccountChange(e) {
      this.setData({ accountIndex: parseInt(e.detail.value) })
    },

    /**
     * 日期选择
     */
    onDateChange(e) {
      const dateStr = e.detail.value
      const d = new Date(dateStr)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const selected = new Date(d.getFullYear(), d.getMonth(), d.getDate())

      let dateLabel
      if (selected.getTime() === today.getTime()) {
        dateLabel = '今天'
      } else {
        dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`
      }

      this.setData({
        dateValue: dateStr,
        dateLabel,
        timestamp: d.getTime()
      })
    },

    /**
     * 保存
     */
    onSave() {
      const { amount, type, selectedCategoryId, note, accountIndex, accounts, timestamp } = this.data
      if (amount === 0 || !selectedCategoryId) return

      const categories = this.data.categories
      const category = categories.find(c => c.id === selectedCategoryId)
      const account = accounts[accountIndex]

      const transaction = {
        id: generateId('tx'),
        amount: Math.round(amount * 100) / 100,
        type,
        categoryId: selectedCategoryId,
        categoryName: category ? category.name : '',
        accountId: account ? account.id : '',
        accountName: account ? account.name : '',
        description: note ? note.substring(0, 20) : (category ? category.name : ''),
        note: note || null,
        source: 'manual',
        timestamp,
        createdAt: Date.now(),
        aiTag: null
      }

      const ok = storage.add(storage.KEYS.TRANSACTIONS, transaction)
      if (ok) {
        app.refreshGlobalCache()  // 刷新全局缓存
        this.setData({ saved: true })
        this.triggerEvent('saved', { transaction })
        setTimeout(() => {
          this.setData({ visible: false, saved: false })
          this.triggerEvent('close')
        }, 600)
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
})
