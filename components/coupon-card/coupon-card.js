const STATUS_MAP = {
  available: '可用',
  used: '已使用',
  expired: '已过期'
}

const normalizeStatus = (coupon = {}, status = '') => {
  const rawValue = status !== undefined && status !== null && status !== ''
    ? status
    : coupon.status
  const numericStatus = Number(rawValue)
  if (Number.isFinite(numericStatus)) {
    if (numericStatus === 0) return 'available'
    if (numericStatus === 1) return 'used'
    if (numericStatus === 2) return 'expired'
  }

  const input = String(rawValue || 'available').toLowerCase()
  if (input.includes('used') || input.includes('已使用')) return 'used'
  if (input.includes('expire') || input.includes('过期')) return 'expired'
  return 'available'
}

Component({
  properties: {
    coupon: {
      type: Object,
      value: {}
    },
    status: {
      type: String,
      value: 'available'
    },
    selectable: {
      type: Boolean,
      value: false
    },
    selected: {
      type: Boolean,
      value: false
    },
    actionText: {
      type: String,
      value: ''
    },
    showAction: {
      type: Boolean,
      value: true
    }
  },

  data: {
    vm: {
      statusKey: 'available',
      statusText: '可用',
      amountText: '0',
      thresholdText: '无门槛',
      expireText: ''
    }
  },

  observers: {
    'coupon,status': function(coupon, status) {
      this.syncCoupon(coupon, status)
    }
  },

  methods: {
    syncCoupon(coupon = {}, status = 'available') {
      const statusKey = normalizeStatus(coupon, status)
      const amount = Number(coupon.amount || coupon.discountAmount || 0)
      const threshold = Number(coupon.minAmount || coupon.threshold || 0)

      this.setData({
        vm: {
          statusKey,
          statusText: STATUS_MAP[statusKey] || '可用',
          amountText: Number.isFinite(amount) ? amount.toString() : '0',
          thresholdText: threshold > 0 ? `满${threshold}可用` : '无门槛',
          expireText: coupon.expireTime || coupon.validUntil || ''
        }
      })
    },

    emit(name) {
      const coupon = this.data.coupon || {}
      this.triggerEvent(name, {
        couponId: coupon._id || coupon.id || '',
        coupon
      })
    },

    onTap() {
      if (this.data.selectable && this.data.vm.statusKey === 'available') {
        this.emit('select')
      } else {
        this.emit('tap')
      }
    },

    onAction(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      if (this.data.vm.statusKey !== 'available') return
      this.emit('action')
    }
  }
})
