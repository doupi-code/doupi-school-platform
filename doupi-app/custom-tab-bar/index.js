/**
 * @fileoverview 自定义底部 Tab（Figma 同款图标资源）
 */

const TAB_LIST = [
  {
    pagePath: "pages/index/index",
    text: "首页",
    icon: "/images/icons/figma-home-gray.svg",
    iconActive: "/images/icons/figma-home.svg",
  },
  {
    pagePath: "pages/profile/profile",
    text: "我的",
    icon: "/images/icons/figma-user.svg",
    iconActive: "/images/icons/figma-user-blue.svg",
  },
];

Component({
  data: {
    selected: 0,
    list: TAB_LIST,
  },

  lifetimes: {
    attached() {
      this.syncSelected();
    },
  },

  pageLifetimes: {
    show() {
      this.syncSelected();
    },
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages();
      if (!pages.length) return;
      const route = pages[pages.length - 1].route;
      const list = TAB_LIST;
      const selected = list.findIndex((item) => item.pagePath === route);
      const nextSelected = selected >= 0 ? selected : 0;
      const shouldRefreshList = list.length !== this.data.list.length
        || list.some((item, index) => {
          const current = this.data.list[index];
          return !current || current.pagePath !== item.pagePath;
        });
      if (shouldRefreshList || nextSelected !== this.data.selected) {
        this.setData({ list, selected: nextSelected });
      }
    },

    switchTab(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index) || index < 0 || index >= this.data.list.length) return;
      const url = "/" + this.data.list[index].pagePath;
      wx.switchTab({ url });
      this.setData({ selected: index });
    },
  },
});
