/**
 * CSV 导出 / 导入服务
 */
const { formatDate, generateId } = require('../utils/format')

/**
 * 将交易记录数组导出为 CSV 字符串
 * @param {Array} transactions
 * @returns {String} UTF-8 BOM + CSV 内容
 */
function exportToCSV(transactions) {
  const BOM = '﻿'
  const header = '交易时间,类型,金额,分类,商户/备注,账户,数据来源'

  const rows = new Array(transactions.length + 1)
  rows[0] = header

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const date = formatDate(tx.timestamp)
    const type = tx.type === 'income' ? '收入' : '支出'
    const amount = tx.amount.toFixed(2)
    const cat = escapeCSV(tx.categoryName || '')
    const note = escapeCSV(tx.note || tx.description || '')
    const account = escapeCSV(tx.accountName || '')
    const source = tx.source === 'wechat' ? '微信识别' : '手动记账'

    rows[i + 1] = `${date},${type},${amount},${cat},${note},${account},${source}`
  }

  return BOM + rows.join('\n')
}

/**
 * CSV 字段转义（含逗号或引号时用双引号包裹）
 */
function escapeCSV(str) {
  if (!str) return ''
  const s = String(str)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/**
 * 解析 CSV 文本为交易记录数组
 * @param {String} text - CSV 文件内容
 * @returns {Array} 解析出的交易记录（不含 id，需后续生成）
 */
function parseCSV(text) {
  // 去除 BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  text = text.trim()
  if (!text) return []

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []  // 只有表头无数据

  // 跳过表头行（含"交易时间"关键词）
  let startIdx = 0
  if (lines[0].includes('交易时间')) startIdx = 1

  const result = []
  for (let i = startIdx; i < lines.length; i++) {
    const fields = splitCSVLine(lines[i])
    if (fields.length < 6) continue

    // 列顺序：交易时间, 类型, 金额, 分类, 商户/备注, 账户, 数据来源
    const dateStr = (fields[0] || '').trim()
    const typeStr = (fields[1] || '').trim()
    const amountStr = (fields[2] || '').trim()
    const catName = (fields[3] || '').trim()
    const note = (fields[4] || '').trim()
    const acctName = (fields[5] || '').trim()
    const sourceStr = (fields[6] || '').trim()

    // 解析日期
    const timestamp = new Date(dateStr).getTime()
    if (isNaN(timestamp)) continue

    // 解析类型
    const type = typeStr.includes('收入') ? 'income' : 'expense'

    // 解析金额
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) continue

    // 解析数据来源
    const source = sourceStr.includes('微信') ? 'wechat' : 'manual'

    result.push({
      amount,
      type,
      categoryName: catName,
      categoryId: '',           // 导入时无法精确匹配，由用户后续手动归类
      accountName: acctName,
      accountId: '',            // 同上
      description: note,
      note,
      source,
      timestamp,
      createdAt: Date.now()
    })
  }

  return result
}

/**
 * 分割 CSV 行（处理双引号包裹的字段）
 */
function splitCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++  // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

/**
 * 从 CSV 内容导入交易记录
 * @param {String} fileContent - CSV 文件原始文本
 * @param {Array} existingTransactions - 现有交易记录（用于去重）
 * @param {Array} categories - 现有分类列表（用于匹配 categoryId）
 * @param {Array} accounts - 现有账户列表（用于匹配 accountId）
 * @returns {{ success: Number, skip: Number, newTxs: Array }}
 */
function importFromCSV(fileContent, existingTransactions, categories, accounts) {
  const parsed = parseCSV(fileContent)
  if (parsed.length === 0) return { success: 0, skip: 0 }

  // 构建分类名→ID索引（不区分大小写）
  const catIndex = {}
  if (categories) {
    for (let i = 0; i < categories.length; i++) {
      catIndex[categories[i].name.toLowerCase()] = categories[i].id
    }
  }

  // 构建账户名→ID索引
  const acctIndex = {}
  if (accounts) {
    for (let i = 0; i < accounts.length; i++) {
      acctIndex[accounts[i].name.toLowerCase()] = accounts[i].id
    }
  }

  // 构建去重集合（金额+时间+来源）
  const dedupSet = new Set()
  for (let i = 0; i < existingTransactions.length; i++) {
    const tx = existingTransactions[i]
    dedupSet.add(tx.amount.toFixed(2) + '|' + tx.timestamp + '|' + tx.source)
  }

  let success = 0, skip = 0
  const newTxs = []
  for (let i = 0; i < parsed.length; i++) {
    const tx = parsed[i]
    const key = tx.amount.toFixed(2) + '|' + tx.timestamp + '|' + tx.source
    if (dedupSet.has(key)) {
      skip++
      continue
    }
    dedupSet.add(key)
    tx.id = generateId('tx')

    // 匹配分类ID
    const catKey = (tx.categoryName || '').toLowerCase()
    if (catKey && catIndex[catKey]) {
      tx.categoryId = catIndex[catKey]
    } else {
      // 尝试前缀匹配（如"餐饮美食"匹配"餐饮"）
      const catKeys = Object.keys(catIndex)
      for (let j = 0; j < catKeys.length; j++) {
        if (catKey.includes(catKeys[j]) || catKeys[j].includes(catKey)) {
          tx.categoryId = catIndex[catKeys[j]]
          break
        }
      }
      // 仍匹配不到则保留空字符串，显示为"其他"
    }

    // 匹配账户ID
    const acctKey = (tx.accountName || '').toLowerCase()
    if (acctKey && acctIndex[acctKey]) {
      tx.accountId = acctIndex[acctKey]
    }

    newTxs.push(tx)
    success++
  }

  return { success, skip, newTxs }
}

module.exports = {
  exportToCSV,
  parseCSV,
  importFromCSV
}
