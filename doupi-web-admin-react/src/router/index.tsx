import React, { Suspense } from 'react';
import { RouteObject, useRoutes, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import BasicLayout from '../layouts/BasicLayout';

const Login = React.lazy(() => import('../pages/login'));
const Dashboard = React.lazy(() => import('../pages/dashboard'));
const NotFound = React.lazy(() => import('../pages/404'));
const ScreenPage = React.lazy(() => import('../pages/screen'));
const CelebrationScreen = React.lazy(() => import('../pages/screen/celebration'));
const EduMaterialReport = React.lazy(() => import('../pages/edu/material/report'));

const CmsConfig = React.lazy(() => import('../pages/cms/config'));
const CmsArticle = React.lazy(() => import('../pages/cms/article'));
const CmsTeacher = React.lazy(() => import('../pages/cms/teacher'));
const CmsFacility = React.lazy(() => import('../pages/cms/facility'));
const CmsBanner = React.lazy(() => import('../pages/cms/banner'));
const CmsFaq = React.lazy(() => import('../pages/cms/faq'));
const CmsBuilder = React.lazy(() => import('../pages/cms/builder'));
const CmsGlobal = React.lazy(() => import('../pages/cms/global'));
const UserProfile = React.lazy(() => import('../pages/system/user/profile'));

export const constantRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Suspense fallback={<Spin size="large" className="global-spin" />}><Login /></Suspense>
  },
  {
    path: '/screen',
    element: <Suspense fallback={<Spin size="large" className="global-spin" />}><ScreenPage /></Suspense>
  },
  {
    path: '/screen/celebration',
    element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CelebrationScreen /></Suspense>
  },
  {
    path: '/celebration',
    element: <Navigate to="/screen/celebration" replace />
  },
  {
    path: '/dashboard',
    element: <Navigate to="/" replace />
  },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      {
        path: '',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><Dashboard /></Suspense>
      },
      {
        path: 'dashboard',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><Dashboard /></Suspense>
      },
      {
        path: 'edu/record',
        element: <Navigate to="/print/record" replace />
      },
      {
        path: 'edu/record/index',
        element: <Navigate to="/print/record" replace />
      },
      {
        path: 'edu/report',
        element: <Navigate to="/print/report" replace />
      },
      {
        path: 'edu/report/index',
        element: <Navigate to="/print/report" replace />
      },
      {
        path: 'print/record/index',
        element: <Navigate to="/print/record" replace />
      },
      {
        path: 'print/report/index',
        element: <Navigate to="/print/report" replace />
      },
      {
        path: 'edu/materialReport',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><EduMaterialReport /></Suspense>
      },
      {
        path: 'edu/material/report',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><EduMaterialReport /></Suspense>
      },
      // 官网CMS独立功能模块路由
      {
        path: 'cms/config',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsConfig /></Suspense>
      },
      {
        path: 'cms/article',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsArticle /></Suspense>
      },
      {
        path: 'cms/teacher',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsTeacher /></Suspense>
      },
      {
        path: 'cms/facility',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsFacility /></Suspense>
      },
      {
        path: 'cms/banner',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsBanner /></Suspense>
      },
      {
        path: 'cms/faq',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsFaq /></Suspense>
      },
      {
        path: 'cms/builder',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsBuilder /></Suspense>
      },
      {
        path: 'cms/global',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><CmsGlobal /></Suspense>
      },
      {
        path: 'user/profile',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><UserProfile /></Suspense>
      },
      {
        path: 'system/user/profile',
        element: <Suspense fallback={<Spin size="large" className="global-spin" />}><UserProfile /></Suspense>
      }
    ]
  },
  {
    path: '*',
    element: <Suspense fallback={<Spin size="large" className="global-spin" />}><NotFound /></Suspense>
  }
];

// Helper to merge dynamic routes with constant routes
export const mergeRoutes = (dynamicRoutes: RouteObject[]): RouteObject[] => {
  const routes = [...constantRoutes];
  const layoutRoute = routes.find(r => r.path === '/');
  
  if (layoutRoute && layoutRoute.children) {
    layoutRoute.children = [...layoutRoute.children, ...dynamicRoutes];
  }
  
  return routes;
};

const RouterComponent: React.FC<{ routes: RouteObject[] }> = ({ routes }) => {
  const element = useRoutes(routes);
  return <>{element}</>;
};

export default RouterComponent;
