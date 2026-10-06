import React, { useEffect, useState } from 'react';
import { Button, Space, Tag } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import screenfull from 'screenfull';
import dayjs from 'dayjs';

interface ScreenHeaderProps {
  connected?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ connected = true }) => {
  const [timeStr, setTimeStr] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleFullscreen = () => {
    if (screenfull.isEnabled) {
      screenfull.toggle();
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <div
      style={{
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px',
        background: 'linear-gradient(180deg, rgba(8, 26, 54, 0.9) 0%, rgba(11, 19, 43, 0) 100%)',
        borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 'bold',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #00F0FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}
        >
          汉外华襄高级中学 · 招生与校务全景数字座舱
        </span>
        <Tag color={connected ? 'cyan' : 'error'} style={{ marginLeft: 16 }}>
          {connected ? '● 实时推送在线' : '○ 数据连接中'}
        </Tag>
      </div>

      <Space size="large">
        <span style={{ fontSize: 16, color: '#A0CFFF', fontFamily: 'monospace' }}>
          {timeStr}
        </span>
        <Button
          type="text"
          ghost
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={handleToggleFullscreen}
          style={{ color: '#00F0FF', borderColor: 'rgba(0,240,255,0.4)' }}
        >
          {isFullscreen ? '退出全屏' : '全屏模式'}
        </Button>
      </Space>
    </div>
  );
};
