import React from 'react';

interface TodayStatsProps {
  data?: {
    todayAppointment?: number;
    todayVerified?: number;
    conversionRate?: string;
  };
}

export const TodayStats: React.FC<TodayStatsProps> = ({ data }) => {
  const stats = [
    { label: '今日新增访校预约', val: data?.todayAppointment ?? 0, unit: '人', color: '#00F0FF' },
    { label: '今日现场到校核销', val: data?.todayVerified ?? 0, unit: '人', color: '#52C41A' },
    { label: '今日核销转化率', val: data?.conversionRate ?? '0.0%', unit: '', color: '#FAAD14' },
  ];

  return (
    <div className="screen-card" style={{ height: 260, padding: 16 }}>
      <div className="screen-card-title">今日招生动态速报</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {stats.map((s, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 240, 255, 0.05)',
              padding: '10px 16px',
              borderRadius: 6,
              border: '1px solid rgba(0, 240, 255, 0.1)',
            }}
          >
            <span style={{ color: '#D9E8F5', fontSize: 14 }}>{s.label}</span>
            <div>
              <span style={{ fontSize: 24, fontWeight: 'bold', color: s.color, fontFamily: 'monospace' }}>
                {s.val}
              </span>
              <span style={{ color: '#88A0B9', fontSize: 12, marginLeft: 4 }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

