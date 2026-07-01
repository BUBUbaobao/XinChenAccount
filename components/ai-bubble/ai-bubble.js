Component({
  properties: {
    role: {
      type: String,
      value: 'assistant'   // 'user' | 'assistant'
    },
    content: {
      type: String,
      value: '',
      observer: '_onContentChange'
    },
    segments: {
      type: Array,
      value: []
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  data: {
    _parsed: []
  },

  methods: {
    _onContentChange(val) {
      // 简单模式：直接显示文本
      this.setData({ displayText: val || '' })
    }
  }
})
