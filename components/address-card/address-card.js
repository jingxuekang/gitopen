Component({
  properties: {
    address: {
      type: Object,
      value: {}
    },
    selectable: {
      type: Boolean,
      value: false
    },
    selected: {
      type: Boolean,
      value: false
    },
    mode: {
      type: String,
      value: 'manage'
    }
  },

  methods: {
    emit(name) {
      const address = this.data.address || {}
      this.triggerEvent(name, {
        addressId: address._id || address.id || '',
        address
      })
    },

    onTap() {
      if (this.data.selectable || this.data.mode === 'select') {
        this.emit('select')
      } else {
        this.emit('tap')
      }
    },

    onEdit(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('edit')
    },

    onDelete(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('delete')
    },

    onSetDefault(e) {
      if (e && e.stopPropagation) e.stopPropagation()
      this.emit('setdefault')
    }
  }
})
