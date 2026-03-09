// components/skeleton/skeleton.js
Component({
  properties: {
    // 骨架屏类型: product-card, product-detail, order-card, list
    type: {
      type: String,
      value: 'product-card'
    },
    // 列表类型时的数量
    count: {
      type: Number,
      value: 3
    }
  }
})
