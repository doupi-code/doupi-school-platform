/**
 * 通用导航栏组件 - nav-bar
 *
 * 功能说明：
 * - 为使用 navigationStyle: custom 的页面提供统一的导航栏
 * - 支持返回按钮、标题、右侧自定义内容插槽
 * - 支持透明背景模式（适用于首页等场景）
 * - 自动处理返回逻辑：有上一页时 navigateBack，否则 switchTab 到首页
 *
 * 使用示例：
 * <nav-bar title="页面标题" />
 * <nav-bar title="详情页" bind:back="onCustomBack" />
 * <nav-bar title="管理后台" transparent="{{true}}">
 *   <view slot="right" bindtap="onRefresh">刷新</view>
 * </nav-bar>
 */

Component({
  properties: {
    /**
     * 导航栏标题
     */
    title: {
      type: String,
      value: ''
    },

    /**
     * 是否显示返回按钮，默认显示
     */
    showBack: {
      type: Boolean,
      value: true
    },

    /**
     * 返回按钮文字，为空则只显示图标
     */
    backText: {
      type: String,
      value: ''
    },

    /**
     * 导航栏背景色，默认白色
     */
    backgroundColor: {
      type: String,
      value: '#ffffff'
    },

    /**
     * 是否透明背景（适用于首页滚动渐变场景）
     */
    transparent: {
      type: Boolean,
      value: false
    }
  },

  data: {},

  methods: {
    /**
     * 处理返回按钮点击
     * 触发 back 事件给父组件，同时执行默认返回行为
     */
    onBack() {
      // 触发事件，允许父组件拦截或自定义返回行为
      this.triggerEvent('back');

      // 默认返回逻辑
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({
          fail: () => {
            // navigateBack 失败时回退到首页
            wx.switchTab({ url: '/pages/index/index' });
          }
        });
      } else {
        // 没有上一页时跳转到首页
        wx.switchTab({ url: '/pages/index/index' });
      }
    }
  }
});
