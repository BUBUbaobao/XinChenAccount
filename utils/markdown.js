/**
 * 简易 Markdown 解析器
 * 解析 **bold** *italic* 列表 换行等，输出 WXML 可渲染的 segments 数组
 */

/**
 * 解析 markdown 文本为富文本段落数组
 * @returns Array<{type: 'text'|'bold'|'h3', content: String}>
 */
function parseMD(text) {
  if (!text) return [{ type: 'text', content: '' }]

  const segments = []
  let i = 0
  const len = text.length

  while (i < len) {
    // 三级标题 ###
    if (text.slice(i, i + 4) === '### ') {
      i += 4
      const end = text.indexOf('\n', i)
      const title = end === -1 ? text.slice(i) : text.slice(i, end)
      if (title.trim()) segments.push({ type: 'h3', content: title.trim() })
      i = end === -1 ? len : end + 1
      continue
    }

    // 双换行 → 段落间隔
    if (text.slice(i, i + 2) === '\n\n') {
      segments.push({ type: 'br' })
      i += 2
      continue
    }

    // 单换行
    if (text[i] === '\n') {
      segments.push({ type: 'br' })
      i++
      continue
    }

    // 加粗 **text**
    if (text.slice(i, i + 2) === '**') {
      i += 2
      const end = text.indexOf('**', i)
      if (end !== -1) {
        segments.push({ type: 'bold', content: text.slice(i, end) })
        i = end + 2
        continue
      }
      // 未闭合，回退为普通文本
      segments.push({ type: 'text', content: '**' })
      continue
    }

    // 斜体 *text*（但不在列表项开头）
    if (text[i] === '*' && text[i - 1] !== '\n') {
      i++
      const end = text.indexOf('*', i)
      if (end !== -1) {
        segments.push({ type: 'italic', content: text.slice(i, end) })
        i = end + 1
        continue
      }
      segments.push({ type: 'text', content: '*' })
      continue
    }

    // 数字列表 1. 2. 等
    if (/^\d+\.\s/.test(text.slice(i))) {
      let numEnd = i
      while (numEnd < len && text[numEnd] !== ' ') numEnd++
      const lineEnd = text.indexOf('\n', numEnd)
      const item = text.slice(numEnd + 1, lineEnd === -1 ? len : lineEnd).trim()
      if (item) segments.push({ type: 'ol', content: item })
      i = lineEnd === -1 ? len : lineEnd + 1
      continue
    }

    // 无序列表 - item 或 * item
    if ((text[i] === '-' || text[i] === '*') && (text[i + 1] === ' ' || text[i + 1] === ' ')) {
      i += 2
      const lineEnd = text.indexOf('\n', i)
      const item = text.slice(i, lineEnd === -1 ? len : lineEnd).trim()
      if (item) segments.push({ type: 'li', content: item })
      i = lineEnd === -1 ? len : lineEnd + 1
      continue
    }

    // 普通文本：取到下一个特殊标记或行尾
    let end = i
    while (end < len) {
      if (text[end] === '\n' || text[end] === '*' ||
          text.slice(end, end + 2) === '**' || text.slice(end, end + 4) === '### ') break
      end++
    }
    if (end > i) {
      segments.push({ type: 'text', content: text.slice(i, end) })
    }
    i = end
  }

  // 合并连续相同类型的 text/br，并过滤空段
  const merged = []
  for (let k = 0; k < segments.length; k++) {
    const seg = segments[k]
    if (seg.type === 'text' && !seg.content.trim()) continue
    if (seg.type === 'br' && merged.length > 0 && merged[merged.length - 1].type === 'br') continue
    merged.push(seg)
  }
  if (merged.length === 0) merged.push({ type: 'text', content: text || ' ' })

  return merged
}

module.exports = { parseMD }
