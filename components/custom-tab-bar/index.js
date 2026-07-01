Component({
  data: {
    selected: 0
  },

  lifetimes: {
    attached() {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        this.setSelectedSilent(pages[pages.length - 1].route)
      }
    }
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        this.setSelectedSilent(pages[pages.length - 1].route)
      }
    }
  },

  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path
      const idx = parseInt(e.currentTarget.dataset.index)
      // 立即更新选中态，不等页面切换
      if (idx !== undefined && idx !== this.data.selected) {
        this.setData({ selected: idx })
      }
      wx.switchTab({ url: `/${path}` })
    },

    setSelectedSilent(path) {
      const tabMap = {
        'pages/home/home': 0,
        'pages/stats/stats': 1,
        'pages/ai/ai': 2,
        'pages/settings/settings': 3
      }
      const idx = tabMap[path]
      if (idx !== undefined && idx !== this.data.selected) {
        this.setData({ selected: idx })
      }
    }
  }
})
