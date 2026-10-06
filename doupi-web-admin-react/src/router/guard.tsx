import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { usePermStore } from '../store/usePermStore';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import RouterComponent, { constantRoutes, mergeRoutes } from './index';

NProgress.configure({ showSpinner: false });

const whiteList = ['/login', '/screen', '/screen/celebration', '/celebration'];

const RouterGuard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, roles, getInfo } = useUserStore();
  const { generateRoutes } = usePermStore();
  const [routes, setRoutes] = useState(constantRoutes);
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    NProgress.start();

    const checkAuth = async () => {
      if (token) {
        if (location.pathname === '/login') {
          navigate('/');
          NProgress.done();
        } else {
          if (roles.length === 0) {
            try {
              await getInfo();
              const accessRoutes = await generateRoutes();
              setRoutes(mergeRoutes(accessRoutes));
              setIsInit(true);
            } catch (error) {
              useUserStore.getState().logout().then(() => {
                navigate('/login');
              });
            }
          } else {
            setIsInit(true);
          }
          NProgress.done();
        }
      } else {
        if (whiteList.indexOf(location.pathname) !== -1) {
          setIsInit(true);
          NProgress.done();
        } else {
          navigate(`/login?redirect=${location.pathname}`);
          NProgress.done();
        }
      }
    };

    checkAuth();
  }, [location.pathname, token, roles.length]);

  if (!isInit && token) {
    return null; // or a full screen loading
  }

  return <RouterComponent routes={routes} />;
};

export default RouterGuard;
