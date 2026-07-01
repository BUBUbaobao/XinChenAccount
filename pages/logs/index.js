const app = getApp()
const { formatTime } = require('../../utils/format')

Page({
  data: {
    logs: []
  },

  onShow() {
    const logs = app.globalData.parse_logs || []
    const list = new Array(logs.length)
    for (let i = logs.length - 1; i >= 0; i--) {
      list[logs.length - 1 - i] = { ...logs[i], timeLabel: formatTime(logs[i].timestamp) }
    }
    this.setData({ logs: list })
  }
})
