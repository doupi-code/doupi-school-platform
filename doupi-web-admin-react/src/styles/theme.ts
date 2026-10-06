import type { ThemeConfig } from 'antd';

export const doupiTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3088F4',
    colorSuccess: '#2DC84D', 
    colorWarning: '#FF6B35',
    colorError: '#F53F3F',
    borderRadius: 8,
    fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Menu: {
      itemHeight: 46,
      itemBorderRadius: 8,
      fontSize: 15,
      iconSize: 18,
      subMenuItemBg: 'transparent',
    },
  },
};
