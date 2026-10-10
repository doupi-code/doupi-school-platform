import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import PrintRecordPage from '../src/pages/edu/record';
import { useUserStore } from '../src/store/useUserStore';
useUserStore.setState({name:'test',nickName:'测试文印员',permissions:['*:*:*'],roles:['admin']});
createRoot(document.getElementById('root')!).render(<ConfigProvider locale={zhCN}><MemoryRouter><PrintRecordPage /></MemoryRouter></ConfigProvider>);
