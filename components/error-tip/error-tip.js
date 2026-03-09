// components/error-tip/error-tip.js
Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 错误消息
    message: {
      type: String,
      value: '加载失败，请重试'
    },
    // 是否显示图标
    showIcon: {
      type: Boolean,
      value: true
    },
    // 是否显示重试按钮
    showRetry: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    /**
     * 重试按钮点击事件
     */
    onRetry() {
      this.triggerEvent('retry')
    }
  }
})
