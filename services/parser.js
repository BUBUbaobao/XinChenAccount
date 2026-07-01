/**
 * 微信支付消息解析引擎
 *
 * 支持的剪贴板格式（用户复制微信支付消息后获得）：
 *
 *   金麦儿杭帮面馆
 *   微信支付凭证
 *   使用零钱支付
 *   ¥20.00
 *
 * 变体：
 *   - 第二行可能是 "微信支付凭证" / "微信支付" / "微信转账"
 *   - 第三行可能是 "使用零钱支付" / "使用银行卡支付" / "已到账"
 *   - 金额可能在 ¥ 前有 "消费" 或 "收款" 前缀
 */

const storage = require('./storage')
const { PRESET_ACCOUNTS } = require('../utils/constants')

/**
 * 解析剪贴板文本
 * @param {String} text
 * @returns {{ success: Boolean, amount: Number, type: String, categoryId: String, categoryName: String, accountId: String, accountName: String, merchant: String, failReason: String|null }}
 */
function parsePaymentText(text) {
  if (!text || typeof text !== 'string') return fail('空文本')

  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return fail('文本行数不足，无法识别')

  const result = {
    success: false,
    amount: 0,
    type: 'expense',
    categoryId: 'cat_010',
    categoryName: '其他',
    accountId: 'acct_001',
    accountName: '微信零钱',
    merchant: '',
    failReason: null
  }

  // ─── 1. 检测是否为微信支付消息 ───
  const isWechatPay = lines.some(l =>
    l.includes('微信支付') || l.includes('支付凭证') || l.includes('转账')
  )
  if (!isWechatPay) {
    // 宽松模式：只要包含 ¥ 金额也尝试解析
    const hasAmount = lines.some(l => /[¥￥]\s*\d+\.?\d*/.test(l))
    if (!hasAmount) return fail('未检测到微信支付消息格式')
  }

  // ─── 2. 提取金额 ───
  for (const line of lines) {
    const match = line.match(/[¥￥]\s*(\d+\.?\d{0,2})/)
    if (match) {
      result.amount = parseFloat(match[1])
      break
    }
  }
  if (result.amount === 0) return fail('未识别到金额')

  // ─── 3. 判断交易方向 ───
  const fullText = lines.join(' ')
  const incomeKeywords = ['收款', '转入', '退款', '到账', '退回', '红包', '转账']
  const expenseKeywords = ['消费', '支付', '扣款', '付款']

  for (const kw of incomeKeywords) {
    if (fullText.includes(kw)) { result.type = 'income'; break }
  }
  // 默认 expense，只有在明确收入时才改 income
  // 大部分支付凭证默认是支出

  // ─── 4. 提取商户名（第一行通常是商户名） ───
  const maybeMerchant = lines[0]
  // 过滤掉显然不是商户名的行
  const skipPatterns = /^(微信|支付|¥|￥|\d|已到账|零钱|银行卡|凭证|消费|收款|转账|红包|退款)/
  if (!skipPatterns.test(maybeMerchant) && maybeMerchant.length <= 30) {
    result.merchant = maybeMerchant
  } else {
    // 从其他行找商户名
    for (const line of lines) {
      if (!skipPatterns.test(line) && line.length <= 30) {
        result.merchant = line
        break
      }
    }
  }

  // ─── 5. 匹配分类 ───
  const rules = storage.getCached(storage.KEYS.RULES) || []
  const enabledRules = rules.filter(r => r.enabled !== false)
  // 按关键词长度降序排序，优先匹配长关键词（更精确）
  enabledRules.sort((a, b) => b.keyword.length - a.keyword.length)

  for (const rule of enabledRules) {
    if (result.merchant.includes(rule.keyword) || fullText.includes(rule.keyword)) {
      result.categoryId = rule.categoryId
      // 查找分类名
      const cats = storage.getCached(storage.KEYS.CATEGORIES) || []
      const cat = cats.find(c => c.id === rule.categoryId)
      if (cat) result.categoryName = cat.name
      break
    }
  }

  // ─── 6. 匹配账户 ───
  if (fullText.includes('零钱')) {
    result.accountId = 'acct_001'
    result.accountName = '微信零钱'
  } else if (fullText.includes('银行卡') || fullText.includes('储蓄卡') || fullText.includes('信用卡')) {
    result.accountId = 'acct_002'
    result.accountName = '微信银行卡'
  }

  result.success = true
  return result
}

/**
 * 解析剪贴板中可能是其他支付平台（支付宝、银行短信等）的文本
 * 宽松解析：只提取金额，方向默认为支出
 */
function parseGenericText(text) {
  if (!text || typeof text !== 'string') return fail('空文本')

  const result = {
    success: false,
    amount: 0,
    type: 'expense',
    categoryId: 'cat_010',
    categoryName: '其他',
    accountId: 'acct_004',
    accountName: '其他',
    merchant: text.trim().split('\n')[0].substring(0, 30),
    failReason: null
  }

  const match = text.match(/[¥￥]\s*(\d+\.?\d{0,2})/)
  if (match) {
    result.amount = parseFloat(match[1])
    result.success = true
  } else {
    // 尝试匹配纯数字金额："20.00" "38.50" 等
    const numMatch = text.match(/(\d+\.\d{2})\s*元?/)
    if (numMatch) {
      result.amount = parseFloat(numMatch[1])
      result.success = true
    }
  }

  if (!result.success) result.failReason = '未识别到金额'
  return result
}

/**
 * 主流入口：自动判断文本类型并解析
 */
function parse(text) {
  const result = parsePaymentText(text)
  if (result.success) {
    _log(text, result, true)
    return result
  }

  // 微信格式失败则尝试通用解析
  const generic = parseGenericText(text)
  _log(text, generic, generic.success)
  return generic
}

function _log(rawText, result, success) {
  try {
    const { generateId } = require('../utils/format')
    const logs = storage.getCached(storage.KEYS.PARSE_LOGS) || []
    if (logs.length >= 100) logs.shift()
    logs.push({
      id: generateId('log'),
      rawText: (rawText || '').slice(0, 200),
      amount: result.amount || 0,
      type: result.type || 'expense',
      categoryName: result.categoryName || '',
      accountName: result.accountName || '',
      merchant: result.merchant || '',
      status: success ? 'success' : 'failed',
      failReason: success ? '' : (result.failReason || '未识别'),
      timestamp: Date.now()
    })
    storage.setAll(storage.KEYS.PARSE_LOGS, logs)
  } catch (_) {}
}

function fail(reason) {
  return {
    success: false,
    amount: 0, type: 'expense',
    categoryId: 'cat_010', categoryName: '其他',
    accountId: 'acct_001', accountName: '微信零钱',
    merchant: '', failReason: reason
  }
}

module.exports = { parse, parsePaymentText, parseGenericText }
