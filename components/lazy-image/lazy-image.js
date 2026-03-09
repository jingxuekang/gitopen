// components/lazy-image/lazy-image.js
Component({
  properties: {
    src: {
      type: String,
      value: ''
    },
    mode: {
      type: String,
      value: 'aspectFill'
    },
    width: {
      type: String,
      value: '100%'
    },
    height: {
      type: String,
      value: '100%'
    },
    imageClass: {
      type: String,
      value: ''
    }
  },

  data: {
    loaded: false,
    error: false
  },

  observers: {
    'src': function(newSrc) {
      if (newSrc) {
        this.setData({
          loaded: true,
          error: false
        })
      }
    }
  },

  methods: {
    onImageLoad() {
      this.setData({ loaded: true, error: false })
      this.triggerEvent('load')
    },

    onImageError() {
      this.setData({ error: true, loaded: false })
      this.triggerEvent('error')
    }
  }
})
