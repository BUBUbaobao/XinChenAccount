const calculator = require('../../services/calculator')
const { getMonthRange, getQuarterRange, getYearRange, formatMonthLabel, formatQuarterLabel, getCurrentMonth, formatAmount } = require('../../utils/format')
const { MACARON_PALETTE } = require('../../utils/constants')

const app = getApp()

Page({
  data: {
    periodMode: 'month',      // 'month' | 'quarter' | 'year'
    currentYear: 2026,
    currentMonth: 7,
    currentQuarter: 3,
    periodLabel: '',
    canGoNext: false,

    viewType: 'expense',       // 'expense' | 'income'

    summary: { income: 0, expense: 0, balance: 0, count: 0 },

    donutData: [],
    donutTotal: '¥0.00',
    donutSub: '',

    ranking: [],

    trendData: [],
    trendTitle: '',
    peakLabel: '',

    hasData: false,
    ready: false
  },

  _lastVersion: -1,
  _lastKey: '',

  onLoad() {
    const now = new Date()
    const cy = now.getFullYear()
    const cm = now.getMonth() + 1
    const cq = Math.ceil(cm / 3)
    this.setData({
      currentYear: cy,
      currentMonth: cm,
      currentQuarter: cq
    })
    this._compute()
  },

  onShow() {
    const v = app.globalData.dataVersion
    const key = this.data.periodMode + '-' + this.data.currentYear + '-' +
      (this.data.periodMode === 'month' ? this.data.currentMonth : this.data.currentQuarter)
    if (v === this._lastVersion && key === this._lastKey) return
    this._compute()
  },

  // ─── 时期导航 ───

  onPrev() {
    const { periodMode } = this.data
    if (periodMode === 'month') {
      if (this.data.currentMonth === 1) {
        this.setData({ currentYear: this.data.currentYear - 1, currentMonth: 12 })
      } else {
        this.setData({ currentMonth: this.data.currentMonth - 1 })
      }
    } else if (periodMode === 'quarter') {
      if (this.data.currentQuarter === 1) {
        this.setData({ currentYear: this.data.currentYear - 1, currentQuarter: 4 })
      } else {
        this.setData({ currentQuarter: this.data.currentQuarter - 1 })
      }
    } else {
      this.setData({ currentYear: this.data.currentYear - 1 })
    }
    this._compute()
  },

  onNext() {
    if (!this.data.canGoNext) return
    const { periodMode } = this.data
    if (periodMode === 'month') {
      if (this.data.currentMonth === 12) {
        this.setData({ currentYear: this.data.currentYear + 1, currentMonth: 1 })
      } else {
        this.setData({ currentMonth: this.data.currentMonth + 1 })
      }
    } else if (periodMode === 'quarter') {
      if (this.data.currentQuarter === 4) {
        this.setData({ currentYear: this.data.currentYear + 1, currentQuarter: 1 })
      } else {
        this.setData({ currentQuarter: this.data.currentQuarter + 1 })
      }
    } else {
      this.setData({ currentYear: this.data.currentYear + 1 })
    }
    this._compute()
  },

  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    const now = new Date()
    this.setData({
      periodMode: mode,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      currentQuarter: Math.ceil((now.getMonth() + 1) / 3)
    })
    this._compute()
  },

  onTypeChange(e) {
    this.setData({ viewType: e.currentTarget.dataset.type })
    this._compute()
  },

  // ─── 核心计算 ───

  _compute() {
    const { periodMode, currentYear, currentMonth, currentQuarter, viewType } = this.data
    const transactions = app.globalData.transactions

    // 1. 时间范围
    let startTs, endTs, periodLabel, canGoNext

    if (periodMode === 'month') {
      const month = currentYear + '-' + String(currentMonth).padStart(2, '0')
      const range = getMonthRange(month)
      startTs = range.start; endTs = range.end
      periodLabel = formatMonthLabel(month)

      const now = new Date()
      const nowMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
      canGoNext = month < nowMonth
    } else if (periodMode === 'quarter') {
      const range = getQuarterRange(currentYear, currentQuarter)
      startTs = range.start; endTs = range.end
      periodLabel = formatQuarterLabel(currentYear, currentQuarter)

      const now = new Date()
      const nowQuarter = Math.ceil((now.getMonth() + 1) / 3)
      canGoNext = (currentYear < now.getFullYear()) ||
        (currentYear === now.getFullYear() && currentQuarter < nowQuarter)
    } else {
      const range = getYearRange(currentYear)
      startTs = range.start; endTs = range.end
      periodLabel = currentYear + '年'

      canGoNext = currentYear < new Date().getFullYear()
    }

    // 2. 汇总
    const summary = calculator.getSummaryByRange(transactions, startTs, endTs)

    // 3. 分类排行
    const rankingRaw = calculator.getCategoryRankingByRange(transactions, startTs, endTs, viewType)
    const catMap = app.globalData._catMap
    const ranking = new Array(rankingRaw.length)
    for (let i = 0; i < rankingRaw.length; i++) {
      const item = rankingRaw[i]
      ranking[i] = {
        ...item,
        emoji: (catMap[item.categoryId] || {}).emoji || '📦',
        color: MACARON_PALETTE[i % MACARON_PALETTE.length],
        barPercent: item.percent
      }
    }

    // 4. 环形图数据（最多9项 + 其他）
    let donutData
    const totalAmount = viewType === 'expense' ? summary.expense : summary.income
    if (ranking.length <= 9) {
      donutData = ranking.map(r => ({ label: r.categoryName, value: r.amount, percent: r.percent, color: r.color }))
    } else {
      donutData = ranking.slice(0, 9).map(r => ({ label: r.categoryName, value: r.amount, percent: r.percent, color: r.color }))
      const restAmount = ranking.slice(9).reduce((s, c) => s + c.amount, 0)
      const restPercent = ranking.slice(9).reduce((s, c) => s + c.percent, 0)
      donutData.push({
        label: '其他', value: Math.round(restAmount * 100) / 100,
        percent: Math.round(restPercent * 100) / 100,
        color: '#E0E0E0'
      })
    }

    // 5. 趋势
    const bucket = periodMode === 'month' ? 'day' : (periodMode === 'quarter' ? 'month' : 'quarter')
    const trendResult = calculator.getTrendByRange(transactions, startTs, endTs, viewType, bucket)

    // 计算柱状图高度百分比（最高为 100%）
    let trendMax = 0
    for (let i = 0; i < trendResult.trend.length; i++) {
      if (trendResult.trend[i].amount > trendMax) trendMax = trendResult.trend[i].amount
    }
    if (trendMax === 0) trendMax = 1

    const trendData = trendResult.trend.map(item => ({
      ...item,
      isPeak: trendResult.peak && item.dateKey === trendResult.peak.dateKey,
      barHeight: Math.max(8, Math.round((item.amount / trendMax) * 260))
    }))
    const peakLabel = trendResult.peak
      ? '最高: ' + trendResult.peak.label + ' ¥' + trendResult.peak.amount.toFixed(2)
      : ''

    const trendTitle = periodMode === 'month' ? '每日趋势' : (periodMode === 'quarter' ? '月度趋势' : '季度趋势')

    // 6. 更新
    this.setData({
      periodLabel, canGoNext,
      summary,
      ranking,
      donutData,
      donutTotal: formatAmount(totalAmount),
      donutSub: viewType === 'expense' ? '总支出' : '总收入',
      trendData,
      trendTitle,
      peakLabel,
      hasData: summary.count > 0,
      ready: true
    }, () => {
      // setData 完成后触发图表重绘
      const donutChart = this.selectComponent('#donutChart')
      const lineChart = this.selectComponent('#lineChart')
      if (donutChart) donutChart.draw()
      if (lineChart) lineChart.draw()
    })

    this._lastVersion = app.globalData.dataVersion
    this._lastKey = periodMode + '-' + currentYear + '-' + (periodMode === 'month' ? currentMonth : currentQuarter)
  }
})
