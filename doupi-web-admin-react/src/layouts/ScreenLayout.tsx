import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';

const ScreenLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scaleX = width / 1920;
        const scaleY = height / 1080;
        const scale = Math.min(scaleX, scaleY);
        
        containerRef.current.style.transform = `scale(${scale}) translate(-50%, -50%)`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000', position: 'relative' }}>
      <div 
        ref={containerRef}
        style={{ 
          width: 1920, 
          height: 1080, 
          position: 'absolute', 
          left: '50%', 
          top: '50%', 
          transformOrigin: '0 0',
          transition: 'transform 0.3s'
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default ScreenLayout;
