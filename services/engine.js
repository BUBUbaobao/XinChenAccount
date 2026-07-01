/**
 * 本地 AI 规则引擎
 * 纯本地 if-else 规则链，零网络依赖，0.5s 内返回结果
 */
const { getCurrentMonth, getMonthRange } = require('../utils/format')

/**
 * 超支检测：遍历分类检查是否超过预算
 */
function detectOverspent(transactions, budgets, month) {
  const m = month || getCurrentMonth()
  const { start, end } = getMonthRange(m)
  const result = []

  for (let i = 0; i < budgets.length; i++) {
    const b = budgets[i]
    if (b.month !== m || b.categoryId === null || b.amount <= 0) continue
    let used = 0
    for (let j = 0; j < transactions.length; j++) {
      const tx = transactions[j]
      if (tx.categoryId === b.categoryId && tx.type === 'expense' &&
          tx.timestamp >= start && tx.timestamp <= end) {
        used += tx.amount
      }
    }
    if (used > b.amount) {
      result.push({ categoryId: b.categoryId, budget: b.amount, used: Math.round(used * 100) / 100, over: Math.round((used - b.amount) * 100) / 100 })
    }
  }
  return result
}

/**
 * 高频消费识别：N天内同类消费超过阈值
 */
function detectHighFreq(transactions, days, threshold) {
  days = days || 7
  threshold = threshold || 3
  const now = Date.now()
  const cutoff = now - days * 24 * 60 * 60 * 1000
  const catCount = {}

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.type !== 'expense' || tx.timestamp < cutoff) continue
    if (!catCount[tx.categoryId]) catCount[tx.categoryId] = { categoryId: tx.categoryId, categoryName: tx.categoryName, count: 0, total: 0 }
    catCount[tx.categoryId].count++
    catCount[tx.categoryId].total += tx.amount
  }

  const result = []
  const keys = Object.keys(catCount)
  for (let i = 0; i < keys.length; i++) {
    const item = catCount[keys[i]]
    if (item.count >= threshold) {
      result.push({ ...item, total: Math.round(item.total * 100) / 100 })
    }
  }
  return result
}

/**
 * 大额异常检测：单笔支出超过近N天平均单笔支出的倍数
 */
function detectAbnormal(transactions, days, multiplier) {
  days = days || 30
  multiplier = multiplier || 3
  const now = Date.now()
  const cutoff = now - days * 24 * 60 * 60 * 1000

  // 计算近N天平均单笔支出
  let totalExpense = 0, count = 0
  for (let i = 0; i < transactions.length; i++) {
    if (transactions[i].type === 'expense' && transactions[i].timestamp >= cutoff) {
      totalExpense += transactions[i].amount
      count++
    }
  }
  if (count === 0) return []
  const avg = totalExpense / count

  // 检测异常
  const result = []
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.type === 'expense' && tx.amount > avg * multiplier) {
      result.push({ id: tx.id, categoryName: tx.categoryName, amount: tx.amount, avg: Math.round(avg * 100) / 100, note: tx.note || tx.description || '' })
    }
  }
  return result
}

/**
 * 生成 AI 账单标签
 */
function tagTransaction(tx, avgDailyExpense) {
  const amount = tx.amount
  const catName = tx.categoryName

  // 固定开销
  const fixedCategories = ['居住', '通讯']
  if (fixedCategories.includes(catName)) return '固定开销'

  // 必要支出：餐饮/交通 且金额在日均范围内
  const necessaryCategories = ['餐饮', '交通', '医疗', '教育']
  if (necessaryCategories.includes(catName) && amount <= (avgDailyExpense || 100)) {
    return '必要支出'
  }

  // 冲动消费：娱乐/购物 且金额较大
  const impulseCategories = ['娱乐', '购物', '服饰']
  if (impulseCategories.includes(catName) && amount > (avgDailyExpense || 100) * 0.5) {
    return '冲动消费'
  }

  return '可选支出'
}

/**
 * 生成基础建议（基于本地规则）
 * @param {String} question - 用户问题
 * @param {Object} summary - { income, expense, balance, recordCount, topCategories }
 * @param {Array} overspent - 超支分类列表
 * @param {Array} highFreq - 高频消费列表
 */
function generateAdvice(question, summary, overspent, highFreq) {
  const q = (question || '').toLowerCase()
  const advices = []

  // ── 根据问题类型定向回答 ──

  // 问分类排行 / 哪里花多了
  if (q.includes('哪里花多') || q.includes('花多') || q.includes('排行') || q.includes('哪些') || q.includes('最多')) {
    if (summary && summary.topCategories && summary.topCategories.length > 0) {
      advices.push('📊 **本月支出排行**：')
      for (let i = 0; i < summary.topCategories.length; i++) {
        const c = summary.topCategories[i]
        advices.push(`${i + 1}. ${c.name}：¥${c.amount}（${c.percent}%，${c.count}笔）`)
      }
      const top = summary.topCategories[0]
      advices.push(`\n💡 最大支出是**${top.name}**，占比 ${top.percent}%，可以关注一下这个分类。`)
    } else {
      advices.push('📊 本月还没有支出记录，记几笔账我就知道哪里花多啦~')
    }
    return advices.join('\n')
  }

  // 问省钱 / 怎么省 / 存钱
  if (q.includes('省钱') || q.includes('怎么省') || q.includes('存钱') || q.includes('省') || q.includes('节约')) {
    if (overspent && overspent.length > 0) {
      const names = overspent.map(o => o.categoryName || o.categoryId).join('、')
      advices.push(`⚠️ ${names}已超预算，先从这里开始控制！`)
    }
    if (highFreq && highFreq.length > 0) {
      const hf = highFreq[0]
      advices.push(`📊 ${hf.categoryName}一周花了 ${hf.count} 笔，减少频次就能省下不少。`)
    }
    advices.push('💡 「先存后花」：工资到账后立刻转 20% 到储蓄账户，剩下的才是可花的。')
    advices.push('💡 「奶茶效应」：每天一杯 ¥15 奶茶，一年就是 ¥5,475，够一趟短途旅行了～')
    return advices.join('\n\n')
  }

  // 问预算 / 超支
  if (q.includes('预算') || q.includes('超支') || q.includes('超标') || q.includes('超')) {
    if (overspent && overspent.length > 0) {
      advices.push('⚠️ **超支警报**：')
      for (let i = 0; i < overspent.length; i++) {
        const o = overspent[i]
        advices.push(`- ${o.categoryName || o.categoryId}：已用 ¥${o.used} / 预算 ¥${o.budget}，超出 ¥${o.over}`)
      }
    } else {
      advices.push('✅ 目前没有分类超出预算，控制得不错！去「设置 → 预算设置」可以为每个分类设定月度预算。')
    }
    return advices.join('\n')
  }

  // 问收入 / 结余
  if (q.includes('收入') || q.includes('结余') || q.includes('余额') || q.includes('赚')) {
    if (summary && summary.income > 0) {
      const rate = (summary.balance / summary.income) * 100
      advices.push(`📊 **本月财务概况**：`)
      advices.push(`- 收入：¥${summary.income}`)
      advices.push(`- 支出：¥${summary.expense}`)
      advices.push(`- 结余：¥${summary.balance}（${rate.toFixed(0)}%）`)
      if (rate < 10) {
        advices.push(`\n⚠️ 结余率偏低，建议控制支出！`)
      } else if (rate > 50) {
        advices.push(`\n🎉 结余率很高，继续保持！`)
      }
    } else {
      advices.push('📊 本月还没有收入记录，记一笔工资到账吧～')
    }
    return advices.join('\n')
  }

  // ── 通用分析（无特定问题时） ──

  // 超支警告
  if (overspent && overspent.length > 0) {
    const names = overspent.map(o => o.categoryName || o.categoryId).join('、')
    const totalOver = overspent.reduce((s, o) => s + o.over, 0)
    advices.push(`⚠️ **超支提醒**：${names}已超出预算合计 ¥${totalOver.toFixed(0)}，建议控制开支。`)
  }

  // 高频消费
  if (highFreq && highFreq.length > 0) {
    for (let i = 0; i < highFreq.length; i++) {
      const item = highFreq[i]
      advices.push(`📊 ${item.categoryName}近 7 天消费 ${item.count} 笔共 ¥${item.total.toFixed(0)}，频率偏高哦~`)
    }
  }

  // 结余率
  if (summary && summary.income > 0) {
    const rate = (summary.balance / summary.income) * 100
    if (rate < 10) {
      advices.push(`💡 本月结余率仅 ${rate.toFixed(0)}%，建议至少储蓄 20%。试试「先存后花」：工资到账先转一部分到储蓄账户。`)
    } else if (rate > 50) {
      advices.push(`🎉 本月结余率高达 ${rate.toFixed(0)}%，理财能力很强！多余资金可考虑投资或存定期。`)
    } else {
      advices.push(`📊 本月结余率 ${rate.toFixed(0)}%，收支基本平衡。`)
    }
  }

  // 兜底
  if (advices.length === 0) {
    if (summary && summary.recordCount > 0) {
      advices.push('😊 本月消费情况正常，继续保持记账习惯！\n\n💡 试试问我：「哪里花多了」「怎么省钱」「预算超了吗」')
    } else {
      advices.push('😊 还没有记账记录呢，先去首页记一笔吧！记几天账我就能帮你分析啦~')
    }
  }

  return advices.join('\n\n')
}

/**
 * 获取聚合汇总（用于 AI Prompt 上下文）
 */
function getAggregatedSummary(transactions, month) {
  const m = month || getCurrentMonth()
  const { start, end } = getMonthRange(m)

  let income = 0, expense = 0
  const catMap = {}

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.timestamp < start || tx.timestamp > end) continue
    if (tx.type === 'income') {
      income += tx.amount
    } else {
      expense += tx.amount
      if (!catMap[tx.categoryName]) {
        catMap[tx.categoryName] = { name: tx.categoryName, amount: 0, count: 0 }
      }
      catMap[tx.categoryName].amount += tx.amount
      catMap[tx.categoryName].count++
    }
  }

  const cats = Object.values(catMap).sort((a, b) => b.amount - a.amount)
  return {
    month: m,
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100,
    recordCount: transactions.filter(tx => tx.timestamp >= start && tx.timestamp <= end).length,
    topCategories: cats.slice(0, 5).map(c => ({
      name: c.name,
      amount: Math.round(c.amount * 100) / 100,
      percent: expense > 0 ? Math.round((c.amount / expense) * 100) : 0,
      count: c.count
    }))
  }
}

module.exports = {
  detectOverspent,
  detectHighFreq,
  detectAbnormal,
  tagTransaction,
  generateAdvice,
  getAggregatedSummary
}
