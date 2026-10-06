import React from 'react';

interface CoreKPIProps {
  totalCount?: number;
  goalCount?: number;
}

export const CoreKPI: React.FC<CoreKPIProps> = ({
  totalCount = 0,
  goalCount = 0,
}) => {
  const percent = goalCount > 0 ? Math.round((totalCount / goalCount) * 100) : (totalCount > 0 ? 100 : 0);


  return (
    <div
      className="screen-card"
      style={{
        height: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 20px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#88A0B9', fontSize: 14, marginBottom: 8 }}>
          2026 学年累计访校接待总人次
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: '#00F0FF',
            fontFamily: 'monospace',
            textShadow: '0 0 15px rgba(0, 240, 255, 0.6)',
          }}
        >
          {totalCount.toLocaleString()}
          <span style={{ fontSize: 16, color: '#88A0B9', marginLeft: 6 }}>人次</span>
        </div>
      </div>

      <div style={{ height: 60, width: 1, background: 'rgba(0, 240, 255, 0.2)' }} />

      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#88A0B9', fontSize: 14, marginBottom: 8 }}>
          高三复读与拔尖生招生目标完成率
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: '#52C41A',
            fontFamily: 'monospace',
            textShadow: '0 0 15px rgba(82, 196, 26, 0.6)',
          }}
        >
          {percent}%
          <span style={{ fontSize: 16, color: '#88A0B9', marginLeft: 6 }}>
            (目标: {goalCount}人)
          </span>
        </div>
      </div>
    </div>
  );
};
