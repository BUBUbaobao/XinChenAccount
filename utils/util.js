/**
 * 保留旧入口，重新导出 format 模块方法
 */
const format = require('./format')

module.exports = {
  formatTime: format.formatTime,
  formatAmount: format.formatAmount,
  formatDate: format.formatDate,
  formatMonthLabel: format.formatMonthLabel,
  formatQuarterLabel: format.formatQuarterLabel,
  generateId: format.generateId,
  getCurrentMonth: format.getCurrentMonth,
  getMonthRange: format.getMonthRange,
  getQuarterRange: format.getQuarterRange,
  getYearRange: format.getYearRange,
  getTodayRange: format.getTodayRange
}
