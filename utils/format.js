/**
 * 格式化工具模块
 * 金额格式化、时间格式化、唯一ID生成
 */

/**
 * 金额格式化：¥1,234.56
 * @param {Number} num - 金额数值
 * @param {Boolean} showSymbol - 是否显示 ¥ 符号，默认 true
 * @returns {String}
 */
function formatAmount(num, showSymbol = true) {
  if (num === null || num === undefined || isNaN(num)) return showSymbol ? '¥0.00' : '0.00'
  const fixed = Math.abs(num).toFixed(2)
  const parts = fixed.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const result = `${intPart}.${parts[1]}`
  if (!showSymbol) return result
  return num < 0 ? `-¥${result}` : `¥${result}`
}

/**
 * 智能时间显示
 * - 今天 → "今天 HH:mm"
 * - 昨天 → "昨天 HH:mm"
 * - 今年 → "MM月dd日"
 * - 往年 → "yyyy年MM月dd日"
 * @param {Number} timestamp - 毫秒时间戳
 * @returns {String}
 */
function formatTime(timestamp) {
  const now = new Date()
  const date = new Date(timestamp)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const timeStr = `${hh}:${mm}`

  if (targetDay.getTime() === today.getTime()) {
    return `今天 ${timeStr}`
  }
  if (targetDay.getTime() === yesterday.getTime()) {
    return `昨天 ${timeStr}`
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 日期格式化：2026-07-01
 * @param {Number} timestamp - 毫秒时间戳
 * @returns {String}
 */
function formatDate(timestamp) {
  const d = new Date(timestamp)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * 月份标签：2026年07月
 * @param {String} month - "2026-07" 格式
 * @returns {String}
 */
function formatMonthLabel(month) {
  const [yyyy, mm] = month.split('-')
  return `${yyyy}年${parseInt(mm)}月`
}

/**
 * 季度标签：2026年Q2
 * @param {Number} year - 年份
 * @param {Number} quarter - 季度 1-4
 * @returns {String}
 */
function formatQuarterLabel(year, quarter) {
  return `${year}年Q${quarter}`
}

/**
 * 生成唯一ID
 * @param {String} prefix - 前缀，如 "tx" / "cat" / "acct" / "rule" / "log" / "budget" / "ai"
 * @returns {String} 如 "tx_1751342000000_a3f2"
 */
function generateId(prefix) {
  const ts = Date.now()
  const rand = Math.random().toString(36).substring(2, 6)
  return `${prefix}_${ts}_${rand}`
}

/**
 * 当前月份字符串 "2026-07"
 * @param {Date} [date] - 可选指定日期对象
 * @returns {String}
 */
function getCurrentMonth(date) {
  const d = date || new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

/**
 * 获取月份的时间戳范围（月初00:00:00 ~ 月末23:59:59）
 * @param {String} month - "2026-07"
 * @returns {{ start: Number, end: Number }}
 */
function getMonthRange(month) {
  const [yyyy, mm] = month.split('-').map(Number)
  const start = new Date(yyyy, mm - 1, 1).getTime()
  const end = new Date(yyyy, mm, 0, 23, 59, 59, 999).getTime()
  return { start, end }
}

/**
 * 获取季度的时间戳范围
 * @param {Number} year
 * @param {Number} quarter - 1-4
 * @returns {{ start: Number, end: Number }}
 */
function getQuarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1).getTime()
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999).getTime()
  return { start, end }
}

/**
 * 获取年份的时间戳范围
 * @param {Number} year
 * @returns {{ start: Number, end: Number }}
 */
function getYearRange(year) {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
  return { start, end }
}

/**
 * 获取今日时间戳范围
 * @returns {{ start: Number, end: Number }}
 */
function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
  return { start, end }
}

module.exports = {
  formatAmount,
  formatTime,
  formatDate,
  formatMonthLabel,
  formatQuarterLabel,
  generateId,
  getCurrentMonth,
  getMonthRange,
  getQuarterRange,
  getYearRange,
  getTodayRange
}
