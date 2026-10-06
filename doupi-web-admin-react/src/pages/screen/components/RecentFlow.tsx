import React, { useEffect, useState } from 'react';
import { Tag, Empty, Spin } from 'antd';
import { listAppointment } from '@/api/recruit/appointment';

export const RecentFlow: React.FC = () => {
  const [flowList, setFlowList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFlow = () => {
    setLoading(true);
    listAppointment({
      pageNum: 1,
      pageSize: 5,
      orderByColumn: 'createTime',
      isAsc: 'desc',
    })
      .then((res: any) => {
        if (res && res.rows) {
          setFlowList(res.rows);
        } else if (Array.isArray(res?.data)) {
          setFlowList(res.data.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFlow();
    const timer = setInterval(fetchFlow, 15000);
    return () => clearInterval(timer);
  }, []);

  // 脱敏姓名
  const maskName = (name?: string) => {
    if (!name) return '-';
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*' + name.substring(2);
  };

  // 格式化时间
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    const parts = timeStr.split(' ');
    return parts.length > 1 ? parts[1] : timeStr;
  };

  return (
    <div className="screen-card" style={{ height: 280, padding: 12 }}>
      <div className="screen-card-title">现场接待到校核销实时流水</div>
      <div style={{ marginTop: 10, overflowY: 'hidden' }}>
        {loading && flowList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : flowList.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: '#88A0B9' }}>暂无现场接待与核销流水</span>}
            />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#88A0B9', borderBottom: '1px solid rgba(0, 240, 255, 0.15)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>时间</th>
                <th style={{ padding: '6px 8px' }}>学生</th>
                <th style={{ padding: '6px 8px' }}>年级</th>
                <th style={{ padding: '6px 8px' }}>单号/核销码</th>
                <th style={{ padding: '6px 8px' }}>状态/接待人</th>
              </tr>
            </thead>
            <tbody>
              {flowList.map((item, idx) => (
                <tr
                  key={item.appointmentId || idx}
                  style={{
                    borderBottom: '1px solid rgba(0, 240, 255, 0.05)',
                    color: '#D9E8F5',
                  }}
                >
                  <td style={{ padding: '8px 8px', fontFamily: 'monospace', color: '#00F0FF' }}>
                    {formatTime(item.verifyTime || item.createTime)}
                  </td>
                  <td style={{ padding: '8px 8px', fontWeight: 'bold' }}>
                    {maskName(item.studentName || item.parentName)}
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <Tag color="cyan" style={{ fontSize: 11 }}>{item.targetGrade || '未指定'}</Tag>
                  </td>
                  <td style={{ padding: '8px 8px', fontFamily: 'monospace' }}>
                    {item.checkInCode || item.appointmentNo || '-'}
                  </td>
                  <td style={{ padding: '8px 8px', color: '#88A0B9' }}>
                    {item.verifier || item.teacherName || (item.status === 'VERIFIED' ? '已核销' : '待接待')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

