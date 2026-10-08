import React, { useMemo } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Dropdown, Button, Tooltip, Space } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  DashboardOutlined,
  ToolOutlined,
  BookOutlined,
  TeamOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  AppstoreOutlined,
  FormOutlined,
  TableOutlined,
  ApartmentOutlined,
  MessageOutlined,
  BarsOutlined,
  ProfileOutlined,
  FileDoneOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ScheduleOutlined,
  ApiOutlined,
  BuildOutlined,
  MoneyCollectOutlined,
  EditOutlined,
  DesktopOutlined,
  CompassOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useUserStore } from '../store/useUserStore';
import { usePermStore } from '../store/usePermStore';
import ErrorBoundary from '../components/ErrorBoundary';

const iconMap: Record<string, React.ReactNode> = {
  education: <BookOutlined />,
  printer: <PrinterOutlined />,
  print: <PrinterOutlined />,
  shopping: <ShoppingOutlined />,
  peoples: <TeamOutlined />,
  system: <SettingOutlined />,
  tool: <ToolOutlined />,
  monitor: <DesktopOutlined />,
  user: <UserOutlined />,
  chart: <BarChartOutlined />,
  documentation: <FileTextOutlined />,
  checkbox: <CheckSquareOutlined />,
  component: <AppstoreOutlined />,
  form: <FormOutlined />,
  table: <TableOutlined />,
  tree: <ApartmentOutlined />,
  message: <MessageOutlined />,
  nested: <BarsOutlined />,
  dict: <ProfileOutlined />,
  log: <FileDoneOutlined />,
  server: <CloudServerOutlined />,
  redis: <DatabaseOutlined />,
  job: <ScheduleOutlined />,
  swagger: <ApiOutlined />,
  build: <BuildOutlined />,
  guide: <CompassOutlined />,
  money: <MoneyCollectOutlined />,
  edit: <EditOutlined />,
  screen: <DesktopOutlined />,
  dashboard: <DashboardOutlined />,
};

const renderIcon = (name?: string) => {
  if (!name || name === '#' || name.trim() === '') return undefined;
  const key = name.toLowerCase().trim();
  return iconMap[key] || <AppstoreOutlined />;
};

const BasicLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { name, nickName, avatar, logout } = useUserStore();
  const { sidebarRoutes } = usePermStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatRoutes = (routes: any[], parentPath = ''): any[] => {
    if (!Array.isArray(routes)) return [];
    const list: any[] = [];

    for (const route of routes) {
      if (route.hidden) continue;

      // 系统单页路由规范化：当 parentId=0 且是一级单页面菜单（如数字化大屏），后端会包装一层 path: "/" 且无 title，内部包含唯一 child
      if (
        (route.path === '/' || !route.path) &&
        route.children &&
        route.children.length === 1 &&
        !route.meta?.title
      ) {
        const child = route.children[0];
        if (!child.hidden) {
          const childPath = child.path.startsWith('/') ? child.path : `/${child.path}`;
          list.push({
            key: childPath,
            path: childPath,
            name: child.meta?.title || child.name || '数字化大屏',
            icon: renderIcon(child.meta?.icon || 'monitor'),
          });
        }
        continue;
      }

      const isExternal = route.path && (route.path.startsWith('http://') || route.path.startsWith('https://'));
      let fullPath = route.path || '';
      if (!isExternal && route.path) {
        if (route.path.startsWith('/')) {
          fullPath = route.path;
        } else {
          const cleanParent = parentPath ? parentPath.replace(/\/+$/, '') : '';
          const cleanChild = route.path.replace(/^\/+/, '');
          fullPath = cleanParent ? `${cleanParent}/${cleanChild}` : `/${cleanChild}`;
        }
      }
      const key = fullPath || route.name || Math.random().toString();
      list.push({
        key,
        path: fullPath,
        name: route.meta?.title || route.name,
        icon: renderIcon(route.meta?.icon),
        routes: route.children && route.children.length > 0 ? formatRoutes(route.children, fullPath) : undefined,
      });
    }
    return list;
  };

  const menuData = useMemo(() => {
    const list = formatRoutes(sidebarRoutes);
    const cmsRoutes = [
      { key: '/cms/builder', path: '/cms/builder', name: '全站页面搭建 (Page Builder)' },
      { key: '/cms/global', path: '/cms/global', name: '全局导航与页脚 (Header & Footer)' },
      { key: '/cms/article', path: '/cms/article', name: '公文与资讯库' },
      { key: '/cms/teacher', path: '/cms/teacher', name: '名师天团库' },
      { key: '/cms/facility', path: '/cms/facility', name: '校园环境设施' },
      { key: '/cms/faq', path: '/cms/faq', name: '常见问答 FAQ' },
      { key: '/cms/banner', path: '/cms/banner', name: '轮播横幅' },
    ];

    const cmsIndex = list.findIndex(item => item.path === '/cms' || item.key === '/cms');
    if (cmsIndex >= 0) {
      list[cmsIndex] = {
        ...list[cmsIndex],
        name: '官网CMS',
        icon: <AppstoreOutlined />,
        routes: cmsRoutes,
      };
    } else {
      list.push({
        key: '/cms',
        path: '/cms',
        name: '官网CMS',
        icon: <AppstoreOutlined />,
        routes: cmsRoutes,
      });
    }
    return list;
  }, [sidebarRoutes]);

  return (
    <ProLayout
      title="豆皮校园管理"
      layout="mix"
      splitMenus={false}
      contentWidth="Fluid"
      fixedHeader
      fixSiderbar
      siderWidth={256}
      route={{ routes: menuData }}
      location={location}
      onMenuHeaderClick={() => navigate('/')}
      actionsRender={() => [
        <Tooltip title="进入全屏深色科技数字化大屏" key="screen-tooltip">
          <Button
            type="primary"
            ghost
            icon={<DesktopOutlined />}
            style={{
              display: 'flex',
              alignItems: 'center',
              fontWeight: 500,
              marginRight: 12,
              borderRadius: 6,
            }}
            onClick={() => {
              const screenUrl = `${import.meta.env.BASE_URL}screen`;
              window.open(screenUrl, '_blank');
            }}
          >
            数字化大屏
          </Button>
        </Tooltip>,
      ]}
      menuItemRender={(item, dom) => (
        <div
          style={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}
          onClick={() => {
            if (item.path) {
              if (item.path.startsWith('http')) {
                window.open(item.path, '_blank');
              } else if (item.path === '/screen') {
                const screenUrl = `${import.meta.env.BASE_URL}screen`;
                window.open(screenUrl, '_blank');
              } else {
                navigate(item.path);
              }
            }
          }}
        >
          {dom}
        </div>
      )}
      avatarProps={{
        src: avatar || undefined,
        title: nickName || name || '教职工',
        render: (_props, _dom) => {
          const displayName = nickName || name || '用户';
          const initialChar = displayName.trim().charAt(0) || '豆';
          return (
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/user/profile') },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
                ],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                }}
              >
                {avatar ? (
                  <Avatar src={avatar} size="default" />
                ) : (
                  <Avatar
                    size="default"
                    style={{
                      backgroundColor: '#1677ff',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '14px',
                      boxShadow: '0 2px 6px rgba(22, 119, 255, 0.25)',
                    }}
                  >
                    {initialChar}
                  </Avatar>
                )}
                <span
                  style={{
                    color: 'rgba(0, 0, 0, 0.85)',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '22px',
                    userSelect: 'none',
                  }}
                >
                  {displayName}
                </span>
              </div>
            </Dropdown>
          );
        },
      }}
      footerRender={() => (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px 24px',
            color: 'rgba(0, 0, 0, 0.45)',
            fontSize: 13,
          }}
        >
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(0, 0, 0, 0.45)' }}
          >
            鄂ICP备2026055716号-1
          </a>
          <span>/</span>
          <span>公安备案号：审核中</span>
        </div>
      )}
    >
      <div style={{ width: '100%', minWidth: 0, minHeight: 'calc(100vh - 80px)', boxSizing: 'border-box' }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </ProLayout>
  );
};

export default BasicLayout;
