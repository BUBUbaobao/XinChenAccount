/**
 * Canvas 2D 图表组件
 * 支持环形图(donut)和折线图(line)两种类型
 */
Component({
  properties: {
    type: { type: String, value: 'donut' },    // 'donut' | 'line'
    data: { type: Array,  value: [] },          // 数据点数组
    centerText: { type: String, value: '' },    // 环形图中心主文字
    centerSub: { type: String, value: '' },     // 环形图中心副文字
    lineColor: { type: String, value: '#FF8A80' },
    chartHeight: { type: Number, value: 400 },
    highlightPeak: { type: Boolean, value: true }
  },

  _ready: false,
  _ctx: null,
  _w: 0,
  _h: 0,

  ready() {
    const query = this.createSelectorQuery()
    query.select('#chartCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        this._w = res[0].width
        this._h = res[0].height
        canvas.width = this._w * dpr
        canvas.height = this._h * dpr
        ctx.scale(dpr, dpr)
        this._ctx = ctx
        this._ready = true
        if (this.properties.data && this.properties.data.length > 0) {
          this._draw()
        }
      })
  },

  /**
   * 公开方法：页面在 setData 后调用此方法触发重绘
   */
  draw() {
    if (!this._ready) return
    if (!this.properties.data || this.properties.data.length === 0) return
    this._draw()
  },

  methods: {
    _draw() {
      if (this.properties.type === 'donut') this._drawDonut()
      else if (this.properties.type === 'line') this._drawLine()
    },

    // ─── 环形图 ───
    _drawDonut() {
      const ctx = this._ctx
      const w = this._w, h = this._h
      ctx.clearRect(0, 0, w, h)

      const segments = this.properties.data
      const cx = w / 2, cy = h / 2
      const outerR = Math.min(cx, cy) - 24
      const innerR = outerR * 0.55

      // 绘制分段
      let startAngle = -Math.PI / 2
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const sweepAngle = (seg.percent / 100) * Math.PI * 2
        if (sweepAngle <= 0) continue

        const endAngle = startAngle + sweepAngle

        // 外弧
        ctx.beginPath()
        ctx.arc(cx, cy, outerR, startAngle, endAngle)
        ctx.arc(cx, cy, innerR, endAngle, startAngle, true)
        ctx.closePath()
        ctx.fillStyle = seg.color || '#ccc'
        ctx.fill()

        // 间隙线
        if (i < segments.length - 1) {
          const mx = cx + Math.cos(endAngle) * ((outerR + innerR) / 2)
          const my = cy + Math.sin(endAngle) * ((outerR + innerR) / 2)
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(endAngle) * innerR, cy + Math.sin(endAngle) * innerR)
          ctx.lineTo(cx + Math.cos(endAngle) * outerR, cy + Math.sin(endAngle) * outerR)
          ctx.strokeStyle = '#FFF5F7'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        startAngle = endAngle
      }

      // 中心文字
      ctx.fillStyle = '#5D4037'
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const mainText = this.properties.centerText || '¥0.00'
      ctx.fillText(mainText, cx, cy - 8)

      ctx.fillStyle = '#8D6E63'
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(this.properties.centerSub || '', cx, cy + 16)
    },

    // ─── 折线图 ───
    _drawLine() {
      const ctx = this._ctx
      const w = this._w, h = this._h
      ctx.clearRect(0, 0, w, h)

      const data = this.properties.data
      if (data.length === 0) return

      const pad = { top: 32, right: 20, bottom: 52, left: 56 }
      const chartW = w - pad.left - pad.right
      const chartH = h - pad.top - pad.bottom

      // 最大值
      let max = 0
      for (let i = 0; i < data.length; i++) {
        if (data[i].amount > max) max = data[i].amount
      }
      if (max === 0) max = 1
      max = max * 1.15

      const ys = (val) => pad.top + chartH * (1 - val / max)

      // ── Y轴网格线和标签 ──
      ctx.fillStyle = '#8D6E63'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const gridLines = 4
      for (let i = 0; i <= gridLines; i++) {
        const val = (max / gridLines) * i
        const y = ys(val)
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(w - pad.right, y)
        ctx.strokeStyle = '#F0E6E8'
        ctx.lineWidth = 1
        ctx.stroke()

        if (val < 1) {
          ctx.fillText('0', pad.left - 8, y)
        } else if (val >= 10000) {
          ctx.fillText((val / 10000).toFixed(1) + 'w', pad.left - 8, y)
        } else {
          ctx.fillText(Math.round(val).toString(), pad.left - 8, y)
        }
      }

      // ── X轴标签 ──
      ctx.fillStyle = '#8D6E63'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const xStep = chartW / Math.max(data.length - 1, 1)

      // 标签跳步（标签过多时隔一个显示）
      const labelStep = data.length > 15 ? Math.ceil(data.length / 10) : (data.length > 8 ? 2 : 1)

      for (let i = 0; i < data.length; i++) {
        const x = pad.left + xStep * i
        if (i % labelStep === 0 || i === data.length - 1) {
          ctx.fillText(data[i].label, x, h - pad.bottom + 8)
        }
      }

      // ── 折线 ──
      ctx.beginPath()
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + xStep * i
        const y = ys(data[i].amount)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = this.properties.lineColor
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()

      // ── 渐变填充 ──
      ctx.beginPath()
      const lastX = pad.left + xStep * (data.length - 1)
      ctx.moveTo(pad.left, ys(0))
      for (let i = 0; i < data.length; i++) {
        ctx.lineTo(pad.left + xStep * i, ys(data[i].amount))
      }
      ctx.lineTo(lastX, ys(0))
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
      grad.addColorStop(0, this.properties.lineColor + '26')   // 15% alpha
      grad.addColorStop(1, this.properties.lineColor + '05')   // 2% alpha
      ctx.fillStyle = grad
      ctx.fill()

      // ── 数据点 ──
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + xStep * i
        const y = ys(data[i].amount)
        const isPeak = this.properties.highlightPeak && (data[i].isPeak === true)

        if (isPeak) {
          // 峰值大圆点
          ctx.beginPath()
          ctx.arc(x, y, 6, 0, Math.PI * 2)
          ctx.fillStyle = this.properties.lineColor
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()

          // 峰值标签
          ctx.fillStyle = this.properties.lineColor
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText('¥' + data[i].amount.toFixed(2), x, y - 12)
        } else {
          // 普通圆点
          ctx.beginPath()
          ctx.arc(x, y, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.strokeStyle = this.properties.lineColor
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    }
  }
})
