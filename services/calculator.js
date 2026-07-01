/**
 * 汇总计算模块（纯函数，不直接读 Storage）
 *
 * 性能优化：所有函数接受外部传入的数据数组，
 * 由调用方从 app.globalData 缓存中获取，避免每页重复读 I/O。
 */

const { getMonthRange, getTodayRange } = require('../utils/format')

/**
 * 按月份筛选 + 按时间倒序
 */
function filterByMonth(transactions, month) {
  const { start, end } = getMonthRange(month)
  const result = []
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.timestamp >= start && tx.timestamp <= end) {
      result.push(tx)
    }
  }
  result.sort((a, b) => b.timestamp - a.timestamp)
  return result
}

/**
 * 月度收支汇总
 */
function getMonthlySummary(transactions, month) {
  const txs = filterByMonth(transactions, month)
  let income = 0, expense = 0
  for (let i = 0; i < txs.length; i++) {
    if (txs[i].type === 'income') income += txs[i].amount
    else expense += txs[i].amount
  }
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100
  }
}

/**
 * 今日收支简况
 */
function getTodaySummary(transactions) {
  const { start, end } = getTodayRange()
  let income = 0, expense = 0
  const catMap = {}

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.timestamp < start || tx.timestamp > end) continue
    if (tx.type === 'income') {
      income += tx.amount
    } else {
      expense += tx.amount
      if (!catMap[tx.categoryId]) {
        catMap[tx.categoryId] = { categoryId: tx.categoryId, categoryName: tx.categoryName, amount: 0 }
      }
      catMap[tx.categoryId].amount += tx.amount
    }
  }

  const sorted = Object.values(catMap).sort((a, b) => b.amount - a.amount)
  const top2 = sorted.slice(0, 2).map(c => ({ ...c, amount: Math.round(c.amount * 100) / 100 }))
  const rest = sorted.slice(2)
  const restAmount = rest.reduce((s, c) => s + c.amount, 0)

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    topCategories: top2,
    otherItem: rest.length > 0 ? { categoryName: '其他' + rest.length + '项', amount: Math.round(restAmount * 100) / 100 } : null
  }
}

/**
 * 分类排行
 */
function getCategoryRanking(transactions, month, type = 'expense') {
  const txs = filterByMonth(transactions, month).filter(tx => tx.type === type)
  const catMap = {}
  let total = 0

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i]
    total += tx.amount
    if (!catMap[tx.categoryId]) {
      catMap[tx.categoryId] = { categoryId: tx.categoryId, categoryName: tx.categoryName, amount: 0, count: 0 }
    }
    catMap[tx.categoryId].amount += tx.amount
    catMap[tx.categoryId].count++
  }

  return Object.values(catMap)
    .map(c => ({ ...c, amount: Math.round(c.amount * 100) / 100, percent: total > 0 ? Math.round((c.amount / total) * 10000) / 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * 每日支出趋势
 */
function getDailyTrend(transactions, month) {
  const txs = filterByMonth(transactions, month).filter(tx => tx.type === 'expense')
  const dateMap = {}

  for (let i = 0; i < txs.length; i++) {
    const d = new Date(txs[i].timestamp)
    const dk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    if (!dateMap[dk]) dateMap[dk] = 0
    dateMap[dk] += txs[i].amount
  }

  const trend = Object.entries(dateMap)
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  let peakDay = null
  if (trend.length > 0) peakDay = trend.reduce((max, cur) => cur.amount > max.amount ? cur : max, trend[0])

  return { trend, peakDay }
}

/**
 * 账户余额
 */
function getAccountBalance(transactions, accountId) {
  let income = 0, expense = 0
  for (let i = 0; i < transactions.length; i++) {
    if (transactions[i].accountId !== accountId) continue
    if (transactions[i].type === 'income') income += transactions[i].amount
    else expense += transactions[i].amount
  }
  return Math.round((income - expense) * 100) / 100
}

/**
 * 已记账天数
 */
function getRecordedDays(transactions, month) {
  const txs = filterByMonth(transactions, month)
  const days = new Set()
  for (let i = 0; i < txs.length; i++) {
    const d = new Date(txs[i].timestamp)
    days.add(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate())
  }
  return days.size
}

/**
 * 分页查询
 */
function getPagedTransactions(transactions, month, page = 1, pageSize = 20) {
  const txs = filterByMonth(transactions, month)
  const start = (page - 1) * pageSize
  return {
    list: txs.slice(start, start + pageSize),
    hasMore: start + pageSize < txs.length
  }
}

/**
 * 预算检查
 */
function checkBudget(transactions, budgets, categoryId, month) {
  const related = budgets.filter(b => b.month === month && b.categoryId === categoryId)
  if (related.length === 0) return { exceeded: false, used: 0, budget: 0, percent: 0 }
  const budget = related[0].amount
  let used = 0
  const txs = filterByMonth(transactions, month)
  for (let i = 0; i < txs.length; i++) {
    if (txs[i].type === 'expense' && txs[i].categoryId === categoryId) used += txs[i].amount
  }
  return {
    exceeded: used > budget,
    used: Math.round(used * 100) / 100,
    budget,
    percent: budget > 0 ? Math.round((used / budget) * 100) : 0
  }
}

/**
 * 首页一站式数据计算（4 次遍历 → 1 次遍历）
 * 将月度汇总、今日速览、记账天数、分页列表合并为单次遍历
 */
function getHomeData(transactions, month, catMap, pageSize, budgets) {
  pageSize = pageSize || 20
  budgets = budgets || []
  const { start: mStart, end: mEnd } = getMonthRange(month)
  const { start: tStart, end: tEnd } = getTodayRange()

  // 计算总预算
  let totalBudget = 0
  const totalBudgetItem = budgets.find(b => b.month === month && b.categoryId === null)
  if (totalBudgetItem) totalBudget = totalBudgetItem.amount

  let mIncome = 0, mExpense = 0
  let tIncome = 0, tExpense = 0
  const tCatMap = {}
  const days = new Set()
  const monthTxs = []

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const ts = tx.timestamp

    // 月度
    if (ts >= mStart && ts <= mEnd) {
      if (tx.type === 'income') mIncome += tx.amount
      else mExpense += tx.amount

      const d = new Date(ts)
      days.add(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate())

      monthTxs.push(tx)

      // 今日
      if (ts >= tStart && ts <= tEnd) {
        if (tx.type === 'income') tIncome += tx.amount
        else {
          tExpense += tx.amount
          if (!tCatMap[tx.categoryId]) tCatMap[tx.categoryId] = { categoryId: tx.categoryId, categoryName: tx.categoryName, amount: 0 }
          tCatMap[tx.categoryId].amount += tx.amount
        }
      }
    }
  }

  // 月度汇总
  const summary = {
    income: Math.round(mIncome * 100) / 100,
    expense: Math.round(mExpense * 100) / 100,
    balance: Math.round((mIncome - mExpense) * 100) / 100
  }

  // 今日速览
  const tSorted = Object.values(tCatMap).sort((a, b) => b.amount - a.amount)
  const top2 = tSorted.slice(0, 2).map(c => ({
    ...c, emoji: (catMap[c.categoryId] || {}).emoji || '📦',
    amount: Math.round(c.amount * 100) / 100,
    amountStr: (Math.round(c.amount * 100) / 100).toFixed(2)
  }))
  const restAmount = tSorted.slice(2).reduce((s, c) => s + c.amount, 0)
  const restAmountRounded = Math.round(restAmount * 100) / 100
  const today = {
    income: Math.round(tIncome * 100) / 100,
    expense: Math.round(tExpense * 100) / 100,
    topCategories: top2,
    otherItem: restAmount > 0 ? { categoryName: '其他' + (tSorted.length - 2) + '项', amount: restAmountRounded, amountStr: restAmountRounded.toFixed(2) } : null
  }

  // 分页（monthTxs 已按原序，需排序）
  monthTxs.sort((a, b) => b.timestamp - a.timestamp)
  const pageList = monthTxs.slice(0, pageSize)
  const list = new Array(pageList.length)
  for (let i = 0; i < pageList.length; i++) {
    const tx = pageList[i]
    list[i] = { ...tx, categoryEmoji: (catMap[tx.categoryId] || {}).emoji || '📦' }
  }

  // 预算百分比
  const budgetPercent = totalBudget > 0 ? Math.round((summary.expense / totalBudget) * 100) : 0

  return {
    summary,
    today,
    recordedDays: days.size,
    transactions: list,
    hasMore: pageSize < monthTxs.length,
    budgetPercent
  }
}

// ═══════════════════════════════════════════════════
//  P3 泛化函数：接受时间戳范围，支持月/季/年视图
// ═══════════════════════════════════════════════════

/**
 * 按时间范围汇总（支出/收入/结余/笔数）
 */
function getSummaryByRange(transactions, startTs, endTs) {
  let income = 0, expense = 0, count = 0
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.timestamp >= startTs && tx.timestamp <= endTs) {
      count++
      if (tx.type === 'income') income += tx.amount
      else expense += tx.amount
    }
  }
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100,
    count
  }
}

/**
 * 按时间范围分类排行（支出或收入）
 */
function getCategoryRankingByRange(transactions, startTs, endTs, type) {
  const catMap = {}
  let total = 0

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.timestamp < startTs || tx.timestamp > endTs) continue
    if (tx.type !== type) continue
    total += tx.amount
    if (!catMap[tx.categoryId]) {
      catMap[tx.categoryId] = { categoryId: tx.categoryId, categoryName: tx.categoryName, amount: 0, count: 0 }
    }
    catMap[tx.categoryId].amount += tx.amount
    catMap[tx.categoryId].count++
  }

  return Object.values(catMap)
    .map(c => ({
      ...c,
      amount: Math.round(c.amount * 100) / 100,
      percent: total > 0 ? Math.round((c.amount / total) * 10000) / 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * 按时间范围 + 桶粒度聚合趋势
 * @param {String} bucket - 'day' | 'month' | 'quarter'
 * @returns {{ trend: Array, peak: Object|null }}
 */
function getTrendByRange(transactions, startTs, endTs, type, bucket) {
  const txs = []
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.timestamp >= startTs && tx.timestamp <= endTs && tx.type === type) {
      txs.push(tx)
    }
  }

  const bucketMap = {}

  function getBucketKey(ts) {
    const d = new Date(ts)
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
    if (bucket === 'day') return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    if (bucket === 'month') return y + '-' + String(m).padStart(2, '0')
    // quarter
    return y + '-Q' + Math.ceil(m / 3)
  }

  function getBucketLabel(key) {
    if (bucket === 'day') return key.split('-')[2] + '日'  // "01日"
    if (bucket === 'month') return parseInt(key.split('-')[1]) + '月'  // "7月"
    return key.split('-Q')[1]  // "Q2" → "2"
  }

  for (let i = 0; i < txs.length; i++) {
    const key = getBucketKey(txs[i].timestamp)
    if (!bucketMap[key]) bucketMap[key] = { dateKey: key, label: getBucketLabel(key), amount: 0 }
    bucketMap[key].amount += txs[i].amount
  }

  const trend = Object.values(bucketMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  for (let i = 0; i < trend.length; i++) trend[i].amount = Math.round(trend[i].amount * 100) / 100

  let peak = null
  if (trend.length > 0) {
    peak = trend.reduce((max, cur) => cur.amount > max.amount ? cur : max, trend[0])
  }

  return { trend, peak }
}

/**
 * 多条件组合搜索交易记录（分页）
 * @param {Object} filters - { keyword, dateStart, dateEnd, amountMin, amountMax, categoryId, type }
 */
function searchTransactions(transactions, filters, page, pageSize) {
  page = page || 1
  pageSize = pageSize || 20
  const { keyword, dateStart, dateEnd, amountMin, amountMax, categoryId, type } = filters || {}

  const matched = []
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]

    // 时间范围筛选
    if (dateStart && tx.timestamp < dateStart) continue
    if (dateEnd && tx.timestamp > dateEnd) continue

    // 金额范围筛选
    if (amountMin && tx.amount < amountMin) continue
    if (amountMax && tx.amount > amountMax) continue

    // 分类筛选
    if (categoryId && tx.categoryId !== categoryId) continue

    // 收支类型筛选
    if (type && type !== 'all' && tx.type !== type) continue

    // 关键词模糊搜索
    if (keyword) {
      const kw = keyword.toLowerCase()
      const note = (tx.note || '').toLowerCase()
      const catName = (tx.categoryName || '').toLowerCase()
      const acctName = (tx.accountName || '').toLowerCase()
      if (!note.includes(kw) && !catName.includes(kw) && !acctName.includes(kw)) continue
    }

    matched.push(tx)
  }

  // 按时间倒序
  matched.sort((a, b) => b.timestamp - a.timestamp)

  const total = matched.length
  const start = (page - 1) * pageSize
  return {
    list: matched.slice(start, start + pageSize),
    total,
    hasMore: start + pageSize < total
  }
}

module.exports = {
  filterByMonth,
  getMonthlySummary,
  getTodaySummary,
  getCategoryRanking,
  getDailyTrend,
  getAccountBalance,
  getRecordedDays,
  getPagedTransactions,
  checkBudget,
  getHomeData,
  getSummaryByRange,
  getCategoryRankingByRange,
  getTrendByRange,
  searchTransactions
}
