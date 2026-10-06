const SEMANTIC_TYPE_SET = {
  success: true,
  warning: true,
  error: true,
  info: true,
  default: true,
  disabled: true
};

const VALUE_TYPE_MAP = {
  '待审核': 'warning',
  '已通过': 'success',
  '已驳回': 'error',
  '待核销': 'info',
  '已核销': 'success',
  '已完成': 'success',
  '已取消': 'disabled'
};

function resolveDisplayText(props) {
  return String(props.text || props.value || '').trim();
}

function resolveVisualType(props, displayText) {
  const inputType = String(props.type || 'default').trim();
  if (SEMANTIC_TYPE_SET[inputType]) {
    return inputType;
  }
  if (inputType === 'status' || inputType === 'audit') {
    return VALUE_TYPE_MAP[displayText] || 'default';
  }
  return VALUE_TYPE_MAP[displayText] || 'default';
}

Component({
  properties: {
    type: {
      type: String,
      value: 'default'
    },
    size: {
      type: String,
      value: 'medium'
    },
    text: {
      type: String,
      value: ''
    },
    value: {
      type: String,
      value: ''
    },
    plain: {
      type: Boolean,
      value: false
    },
    showDot: {
      type: Boolean,
      value: false
    }
  },

  data: {
    displayText: '',
    visualType: 'default',
    computedShowDot: false
  },

  observers: {
    'type, text, value, showDot': function () {
      this.syncViewData();
    }
  },

  lifetimes: {
    attached() {
      this.syncViewData();
    }
  },

  methods: {
    syncViewData() {
      const displayText = resolveDisplayText(this.properties);
      const visualType = resolveVisualType(this.properties, displayText);
      const computedShowDot = !!this.properties.showDot || this.properties.type === 'status' || this.properties.type === 'audit';
      this.setData({
        displayText,
        visualType,
        computedShowDot
      });
    },

    onTap() {
      this.triggerEvent('tap');
    }
  }
});
