import { create } from 'zustand';
import { getRouters } from '../api/login';
import { RouteObject, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

// Using a module glob import for all pages to allow dynamic component loading
const modules = import.meta.glob('../pages/**/*.tsx');

interface PermState {
  routes: RouteObject[];
  sidebarRoutes: any[];
  generateRoutes: () => Promise<RouteObject[]>;
}

const resolveComponent = (componentName: string) => {
  const candidates = [
    `../pages/${componentName}.tsx`,
    `../pages/${componentName}/index.tsx`,
    // edu <-> stock 历史数据库兼容回退
    `../pages/${componentName.replace(/^edu\//, 'stock/')}.tsx`,
    `../pages/${componentName.replace(/^edu\//, 'stock/')}/index.tsx`,
    `../pages/${componentName.replace(/^stock\//, 'edu/')}.tsx`,
    `../pages/${componentName.replace(/^stock\//, 'edu/')}/index.tsx`,
    // edu <-> print 文印解耦双向兼容回退
    `../pages/${componentName.replace(/^edu\//, 'print/')}.tsx`,
    `../pages/${componentName.replace(/^edu\//, 'print/')}/index.tsx`,
    `../pages/${componentName.replace(/^print\//, 'edu/')}.tsx`,
    `../pages/${componentName.replace(/^print\//, 'edu/')}/index.tsx`,
    // monitor/cache/list 别名
    `../pages/${componentName.replace('monitor/cache/list', 'monitor/cache/list')}.tsx`,
    `../pages/${componentName.replace('monitor/cache/list', 'monitor/cacheList/index')}.tsx`,
    // monitor/job/log 别名
    `../pages/${componentName.replace('monitor/job-log/index', 'monitor/job/log')}.tsx`,
    `../pages/${componentName.replace('monitor/job/log', 'monitor/job/log')}.tsx`,
  ];

  for (const c of candidates) {
    if (modules[c]) {
      return modules[c];
    }
  }
  return null;
};

const filterAsyncRouter = (asyncRouterMap: any[], isTop = true) => {
  return asyncRouterMap.filter((route) => {
    if (isTop && route.path && route.path.startsWith('/')) {
      route.path = route.path.slice(1);
    }
    if (route.component) {
      if (route.component === 'Layout' || route.component === 'ParentView') {
        route.element = <Outlet />;
      } else {
        const loader = resolveComponent(route.component);
        const Component = lazy((loader as any) || (() => import('../pages/404.tsx')));
        route.element = (
          <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}>
            <Component />
          </Suspense>
        );
      }
    }
    if (route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, false);
    }
    return true;
  });
};

export const usePermStore = create<PermState>((set) => ({
  routes: [],
  sidebarRoutes: [],
  generateRoutes: async () => {
    const res: any = await getRouters();
    const sdata = JSON.parse(JSON.stringify(res.data));
    const rdata = JSON.parse(JSON.stringify(res.data));
    
    const sidebarRoutes = sdata;
    const rewriteRoutes = filterAsyncRouter(rdata);
    
    set({ routes: rewriteRoutes, sidebarRoutes });
    return rewriteRoutes;
  }
}));
