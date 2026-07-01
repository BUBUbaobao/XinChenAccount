const engine = require('../../services/engine')
const ai = require('../../services/ai')
const { parseMD } = require('../../utils/markdown')

const app = getApp()

Page({
  data: {
    messages: [],
    inputValue: '',
    loading: false,
    streamingContent: '',
    streamingSegments: [],
    showWelcome: true
  },

  _streamTask: null,

  onUnload() {
    if (this._streamTask) {
      this._streamTask.abort()
      this._streamTask = null
    }
  },

  // 切换 Tab 回来时，内存中 message 不丢（不调用任何刷新逻辑）

  // ─── 发送消息 ───

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onSend() {
    const question = this.data.inputValue.trim()
    if (!question || this.data.loading) return

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const userMsg = { id: msgId, role: 'user', content: question, segments: [], timestamp: Date.now() }
    const messages = [...this.data.messages, userMsg]
    this.setData({ inputValue: '', messages, showWelcome: false, loading: true, streamingContent: '', streamingSegments: [] })
    this._scrollToBottom()

    const config = app.globalData.config

    if (config.aiMode === 'cloud' && config.apiKey) {
      const summary = engine.getAggregatedSummary(app.globalData.transactions)
      const prompt = ai.buildPrompt(question, summary)
      let apiKey
      try { apiKey = ai.decryptKey(config.apiKey) } catch (_) { apiKey = '' }

      this._streamTask = ai.callCloudAIStream(prompt, apiKey,
        (chunk) => {
          const text = this.data.streamingContent + chunk
          this.setData({ streamingContent: text, streamingSegments: parseMD(text) })
        },
        (fullText) => {
          this._appendReply(fullText)
        },
        (err) => {
          console.error('[AI] error:', err)
          this._appendReply('😅 抱歉，AI 暂时开小差了…\n\n**错误**：' + (err.message || '未知'))
        }
      )
    } else {
      const summary = engine.getAggregatedSummary(app.globalData.transactions)
      const overspent = engine.detectOverspent(app.globalData.transactions, app.globalData.budgets)
      const highFreq = engine.detectHighFreq(app.globalData.transactions)
      const reply = engine.generateAdvice(question, summary, overspent, highFreq)
      this._appendReply(reply)
    }

    this._scrollToBottom()
  },

  _appendReply(reply) {
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const aiMsg = { id: msgId, role: 'assistant', content: reply, segments: parseMD(reply), timestamp: Date.now() }
    const messages = [...this.data.messages, aiMsg]
    this.setData({ messages, loading: false, streamingContent: '', streamingSegments: [] })
    this._scrollToBottom()
  },

  // ─── 生成报告 ───

  onGenerateReport() {
    if (this.data.loading) return

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const userMsg = { id: msgId, role: 'user', content: '✨ 生成我的消费报告', segments: [], timestamp: Date.now() }
    const messages = [...this.data.messages, userMsg]
    this.setData({ loading: true, showWelcome: false, messages, streamingContent: '', streamingSegments: [] })

    const config = app.globalData.config

    if (config.aiMode === 'cloud' && config.apiKey) {
      const summary = engine.getAggregatedSummary(app.globalData.transactions)
      const prompt = ai.buildPrompt('请根据我的消费数据，生成一份详细的月度消费报告，包括：1.整体收支概况 2.主要支出分类分析 3.需要关注的问题 4.下月省钱建议', summary)
      let apiKey
      try { apiKey = ai.decryptKey(config.apiKey) } catch (_) { apiKey = '' }

      this._streamTask = ai.callCloudAIStream(prompt, apiKey,
        (chunk) => {
          const text = this.data.streamingContent + chunk
          this.setData({ streamingContent: text, streamingSegments: parseMD(text) })
        },
        (fullText) => {
          this._appendReply(fullText)
        },
        (err) => {
          console.error('[AI] error:', err)
          this._appendReply('😅 报告生成失败…\n\n**错误**：' + (err.message || '未知'))
        }
      )
    } else {
      const summary = engine.getAggregatedSummary(app.globalData.transactions)
      const overspent = engine.detectOverspent(app.globalData.transactions, app.globalData.budgets)
      const highFreq = engine.detectHighFreq(app.globalData.transactions)
      const reply = engine.generateAdvice('生成消费报告', summary, overspent, highFreq)
      this._appendReply(reply)
    }

    this._scrollToBottom()
  },

  // ─── 辅助 ───

  _scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('#chatArea')
        .boundingClientRect()
        .select('#chatEnd')
        .boundingClientRect()
        .exec((res) => {
          if (res[0] && res[1]) {
            const diff = res[1].bottom - res[0].bottom
            if (diff > 0) {
              wx.pageScrollTo({ scrollTop: res[1].bottom + diff, duration: 200 })
            }
          }
        })
    }, 100)
  }
})
