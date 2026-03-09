Component({
  properties: {
    product: {
      type: Object,
      value: {}
    },
    showCart: {
      type: Boolean,
      value: false
    },
    showMemberPrice: {
      type: Boolean,
      value: true
    },
    layout: {
      type: String,
      value: 'horizontal'
    }
  },

  methods: {
    onTap() {
      const product = this.data.product || {}
      this.triggerEvent('tap', {
        productId: product._id || product.id || '',
        product
      })
    },

    onAddCart(e) {
      if (e && e.stopPropagation) {
        e.stopPropagation()
      }
      const product = this.data.product || {}
      this.triggerEvent('addcart', {
        productId: product._id || product.id || '',
        product
      })
    }
  }
})
