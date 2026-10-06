/**
 * loading-spinner 组件
 * 加载动画组件，用于展示加载状态
 *
 * Props:
 * - type: 加载类型 ('spinner' | 'dots' | 'skeleton')
 * - size: 尺寸 ('small' | 'medium' | 'large')
 * - color: 颜色（默认使用主题色）
 * - text: 加载提示文本
 * - fullscreen: 是否全屏显示
 * - transparent: 是否透明背景
 */

Component({
  properties: {
    /**
     * 加载类型
     * 可选值：spinner（旋转）、dots（点状动画）、skeleton（骨架屏）
     */
    type: {
      type: String,
      value: 'spinner'
    },

    /**
     * 尺寸
     * 可选值：small（小）、medium（中）、large（大）
     */
    size: {
      type: String,
      value: 'medium'
    },

    /**
     * 自定义颜色
     */
    color: {
      type: String,
      value: ''
    },

    /**
     * 加载提示文本
     */
    text: {
      type: String,
      value: ''
    },

    /**
     * 是否全屏显示
     */
    fullscreen: {
      type: Boolean,
      value: false
    },

    /**
     * 是否透明背景（仅 fullscreen 时生效）
     */
    transparent: {
      type: Boolean,
      value: false
    }
  },

  data: {},

  methods: {}
});
