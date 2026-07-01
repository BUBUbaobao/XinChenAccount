/**
 * 云端 AI 接口调用（DeepSeek）
 */
const { request } = require('../utils/request')

const API_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'
const SYSTEM_PROMPT = `你是"昕辰记账"小程序的AI理财助手，名叫"小昕辰"。你的角色是帮助用户分析消费习惯、提供省钱建议和理财指导。

回复规则：
1. 必须使用中文回复，禁止使用英文或其他语言
2. 用亲切、活泼、可爱的语气，像朋友聊天一样
3. 每次回复控制在200字以内，简洁有力
4. 使用 Emoji 让回复更生动
5. 如果用户问到具体消费数字，从提供的脱敏摘要中引用
6. 不要编造数据，只说摘要里有的内容
7. 不要提"脱敏数据"或技术细节`

/**
 * 构造 Prompt
 * @param {String} question - 用户问题
 * @param {Object} summary - 脱敏后的聚合摘要
 */
function buildPrompt(question, summary) {
  let context = ''
  if (summary) {
    context = `\n【用户本月财务摘要（脱敏）】\n` +
      `总收入：¥${summary.income} 总支出：¥${summary.expense} 结余：¥${summary.balance}\n` +
      `记账笔数：${summary.recordCount} 笔\n`
    if (summary.topCategories && summary.topCategories.length > 0) {
      context += '支出TOP分类：\n'
      for (let i = 0; i < summary.topCategories.length; i++) {
        const c = summary.topCategories[i]
        context += `  ${i + 1}. ${c.name}：¥${c.amount}（占比 ${c.percent}%，${c.count}笔）\n`
      }
    }
  }
  return question + context
}

/**
 * 调用 DeepSeek API
 * @param {String} userMessage - 用户消息（含脱敏上下文）
 * @param {String} apiKey - API Key
 * @returns {Promise<String>} AI 回复文本
 */
async function callCloudAI(userMessage, apiKey) {
  const res = await request({
    url: API_URL,
    method: 'POST',
    header: {
      'Authorization': 'Bearer ' + apiKey
    },
    data: {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 600,
      temperature: 0.8
    }
  })
  if (res && res.choices && res.choices.length > 0) {
    return res.choices[0].message.content
  }
  throw new Error('AI返回数据异常')
}

/**
 * 流式调用 DeepSeek API
 * @param {String} userMessage - 用户消息
 * @param {String} apiKey - API Key
 * @param {Function} onChunk(chunkText) - 每收到一段文本就回调
 * @param {Function} onDone(fullText) - 完成时回调
 * @param {Function} onError(err) - 出错时回调
 */
function callCloudAIStream(userMessage, apiKey, onChunk, onDone, onError) {
  let fullText = ''
  let buffer = ''

  const task = wx.request({
    url: API_URL,
    method: 'POST',
    enableChunked: true,
    header: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    data: {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 600,
      temperature: 0.8,
      stream: true
    },
    success() {
      // 流结束：处理缓冲区剩余数据 + 触发完成回调
      if (buffer) {
        const lines = buffer.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line || !line.startsWith('data: ')) continue
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') continue
          try {
            const json = JSON.parse(dataStr)
            const delta = json.choices && json.choices[0] && json.choices[0].delta
            if (delta && delta.content) {
              fullText += delta.content
              onChunk(delta.content)
            }
          } catch (_) {}
        }
      }
      if (onDone) onDone(fullText)
    },
    fail(err) {
      if (onError) onError(new Error(err.errMsg || '网络请求失败'))
    }
  })

  task.onChunkReceived((res) => {
    try {
      // ArrayBuffer → UTF-8 字符串（正确处理中文等多字节字符）
      let chunk = ''
      if (res.data instanceof ArrayBuffer) {
        chunk = _decodeUTF8(new Uint8Array(res.data))
      } else {
        chunk = String(res.data || '')
      }

      buffer += chunk
      // 按行解析 SSE
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''  // 最后一行可能不完整，保留

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line || !line.startsWith('data: ')) continue

        const dataStr = line.slice(6)
        if (dataStr === '[DONE]') continue

        try {
          const json = JSON.parse(dataStr)
          const delta = json.choices && json.choices[0] && json.choices[0].delta
          if (delta && delta.content) {
            fullText += delta.content
            if (onChunk) onChunk(delta.content)
          }
        } catch (_) {}
      }
    } catch (_) {}
  })

  // 返回 task 引用，调用方可 task.abort() 中断
  return task
}

/**
 * 纯 JS Base64 编码（兼容微信小程序，不依赖 btoa）
 */
function _toBase64(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2]
    result += chars[b1 >> 2]
    result += chars[((b1 & 3) << 4) | (b2 >> 4)]
    result += b2 !== undefined ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '='
    result += b3 !== undefined ? chars[b3 & 63] : '='
  }
  return result
}

function _fromBase64(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '')
  const bytes = []
  let i = 0
  while (i < base64.length) {
    const b1 = chars.indexOf(base64[i++] || 'A')
    const b2 = chars.indexOf(base64[i++] || 'A')
    const c3 = base64[i++], c4 = base64[i++]
    const b3 = c3 === '=' ? -1 : chars.indexOf(c3)
    const b4 = c4 === '=' ? -1 : chars.indexOf(c4)

    bytes.push((b1 << 2) | (b2 >> 4))
    if (b3 >= 0) bytes.push(((b2 & 15) << 4) | (b3 >> 2))
    if (b4 >= 0) bytes.push(((b3 & 3) << 6) | b4)
  }
  let result = ''
  for (let j = 0; j < bytes.length; j++) {
    const b = bytes[j]
    if (b < 0x80) {
      result += String.fromCharCode(b)
    } else if (b < 0xe0) {
      result += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++j] & 0x3f))
    } else {
      result += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++j] & 0x3f) << 6) | (bytes[++j] & 0x3f))
    }
  }
  return result
}

/**
 * 简单加密 API Key（XOR + Base64，纯 JS 实现，兼容微信小程序）
 */
function encryptKey(key) {
  if (!key) return ''
  const xorKey = 'xinchen2026'
  let result = ''
  for (let i = 0; i < key.length; i++) {
    result += String.fromCharCode(key.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length))
  }
  return _toBase64(result)
}

/**
 * 解密 API Key
 */
function decryptKey(encrypted) {
  if (!encrypted) return ''
  try {
    const decoded = _fromBase64(encrypted)
    if (!decoded) return ''
    const xorKey = 'xinchen2026'
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length))
    }
    return result
  } catch (e) {
    return ''
  }
}

/**
 * UTF-8 字节数组 → JavaScript 字符串（正确处理中文等多字节字符）
 */
function _decodeUTF8(bytes) {
  let result = ''
  let i = 0
  while (i < bytes.length) {
    const b1 = bytes[i++]
    if (b1 < 0x80) {
      // 单字节 ASCII
      result += String.fromCharCode(b1)
    } else if ((b1 & 0xe0) === 0xc0) {
      // 双字节
      const b2 = bytes[i++]
      result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f))
    } else if ((b1 & 0xf0) === 0xe0) {
      // 三字节（中文等）
      const b2 = bytes[i++], b3 = bytes[i++]
      result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f))
    } else if ((b1 & 0xf8) === 0xf0) {
      // 四字节（emoji 等）
      const b2 = bytes[i++], b3 = bytes[i++], b4 = bytes[i++]
      const code = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)
      if (code > 0xffff) {
        result += String.fromCharCode(0xd800 + ((code - 0x10000) >> 10))
        result += String.fromCharCode(0xdc00 + ((code - 0x10000) & 0x3ff))
      } else {
        result += String.fromCharCode(code)
      }
    }
  }
  return result
}

module.exports = {
  buildPrompt,
  callCloudAI,
  callCloudAIStream,
  encryptKey,
  decryptKey
}
