const { normalizeSpecText } = require('../../utils/util.js')

const STATUS_MAP = {
  0: { code: 'pending_payment', text: '待支付' },
  1: { code: 'pending_delivery', text: '待发货' },
  2: { code: 'pending_receive', text: '待收货' },
  3: { code: 'completed', text: '已完成' },
  4: { code: 'cancelled', text: '已取消' },
  PENDING_PAYMENT: { code: 'pending_payment', text: '待支付' },
  PENDING_DELIVERY: { code: 'pending_delivery', text: '待发货' },
  PENDING_RECEIVE: { code: 'pending_receive', text: '待收货' },
  COMPLETED: { code: 'completed', text: '已完成' },
  CANCELLED: { code: 'cancelled', text: '已取消' }
}

const normalizeStatus = (rawStatus) => {
  if (rawStatus in STATUS_MAP) {
    return STATUS_MAP[rawStatus]
  }
  if (typeof rawStatus === 'string') {
    const key = rawStatus.toUpperCase()
    if (key in STATUS_MAP) {
      return STATUS_MAP[key]
    }
  }
  return { code: 'unknown', text: '处理中' }
}

const normalizeAmount = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00'
  if (Number.isInteger(amount)) {
    return (amount / 100).toFixed(2)
  }
  return amount.toFixed(2)
}

const normalizeItem = (item = {}) => {
  const rawQuantity = Number(
    item.quantity !== undefined ? item.quantity : (item.count !== undefined ? item.count : 1)
  )
  const quantityText = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1

  const priceText = item.priceText || item.displayPrice || item.priceDisplay || normalizeAmount(
    item.price !== undefined
      ? item.price
      : (item.unitPrice !== undefined ? item.unitPrice : item.amount)
  )

  return {
    ...item,
    specText: normalizeSpecText(item.specText || item.spec || ''),
    quantityText,
    displayPrice: priceText
  }
}

Component({
  properties: {
    order: {
      type: Object,
      value: {},
      observer(order) {
        this.syncOrder(order)
      }
    }
  },

  data: {
    vm: {
      orderNo: '',
      statusText: '处理中',
      statusCode: 'unknown',
      items: [],
      amountText: '0.00',
      canPay: false,
      canCancel: false,
      canConfirm: false,
      canReview: false,
      canBuyAgain: false
    }
  },

  methods: {
    syncOrder(order = {}) {
      const status = normalizeStatus(order.status)
      const sourceItems = Array.isArray(order.items)
        ? order.items
        : (Array.isArray(order.products) ? order.products : [])
      const items = sourceItems.map(normalizeItem)
      const amountSource = order.payAmount !== undefined
        ? order.payAmount
        : (order.totalAmount !== undefined
          ? order.totalAmount
          : (order.totalPrice !== undefined ? order.totalPrice : order.amount))
      const amountText = order.payAmountText || order.amountText || normalizeAmount(amountSource)

      this.setData({
        vm: {
          orderNo: order.orderNo || order._id || '',
          statusText: status.text,
          statusCode: status.code,
          items,
          amountText,
          canPay: status.code === 'pending_payment',
          canCancel: status.code === 'pending_payment',
          canConfirm: status.code === 'pending_receive',
          canReview: status.code === 'completed' && !order.reviewed && !order.hasReviewed,
          canBuyAgain: status.code === 'completed' || status.code === 'cancelled'
        }
      })
    },

    emit(name) {
      const order = this.data.order || {}
      this.triggerEvent(name, {
        orderId: order._id || '',
        orderNo: order.orderNo || '',
        order
      })
    },

    onTap() {
      this.emit('tap')
    },

    onPay(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('pay')
    },

    onCancel(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('cancel')
    },

    onConfirm(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('confirm')
    },

    onReview(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('review')
    },

    onBuyAgain(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('buyagain')
    }
  }
})
