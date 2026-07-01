const { formatAmount, formatTime } = require('../../utils/format')

Component({
  properties: {
    transaction: {
      type: Object,
      value: {}
    },
    emoji: {
      type: String,
      value: '📦'
    }
  },

  observers: {
    'transaction.id': function (id) {
      const tx = this.data.transaction
      if (tx && tx.id) {
        this.setData({
          name: tx.description || tx.categoryName || '',
          note: tx.note || '',
          type: tx.type || 'expense',
          amountStr: formatAmount(tx.amount, false),
          timeStr: formatTime(tx.timestamp)
        })
      }
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.transaction.id })
    }
  }
})
