Component({
  data: {
    animating: false
  },

  methods: {
    onTap() {
      // 点击缩放动画
      this.setData({ animating: true })
      setTimeout(() => {
        this.setData({ animating: false })
      }, 150)

      // 触发父组件事件
      this.triggerEvent('tap')
    }
  }
})
