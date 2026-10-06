import { useState } from 'react';
import { Input, Button, Card, Tag, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import SectionTitle from '@/components/SectionTitle';
import { queryByPhone } from '@/api/appointment';

export default function Query() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      message.warning('请输入有效的手机号码');
      return;
    }

    setLoading(true);
    try {
      const res: any = await queryByPhone(phone);
      const list = Array.isArray(res) ? res : (res?.list || (res ? [res] : []));
      setRecords(list);
      setHasSearched(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'SUBMITTED':
        return <Tag color="orange">待到校/审核</Tag>;
      case 'CONFIRMED':
      case 'APPROVED':
        return <Tag color="green">预约有效</Tag>;
      case 'COMPLETED':
      case 'CHECKED_IN':
        return <Tag color="blue">已核销到校</Tag>;
      case 'CANCELLED':
        return <Tag color="red">已取消</Tag>;
      default:
        return <Tag color="default">{status || '有效'}</Tag>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SectionTitle title="预约查询" subtitle="输入手机号查询您的预约记录" />
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8 flex justify-center">
        <div className="flex w-full max-w-md gap-2">
          <Input 
            size="large" 
            placeholder="请输入预约时填写的手机号" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined className="text-gray-400" />}
          />
          <Button type="primary" size="large" onClick={handleSearch} loading={loading}>
            查询
          </Button>
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">查询结果 ({records.length})</h3>
          
          {records.length > 0 ? (
            records.map((record, index) => (
              <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold">{record.studentName || record.parentName || '访校家长'}</span>
                      {getStatusTag(record.status || 'APPROVED')}
                    </div>
                    <div className="text-gray-500 space-y-1">
                      <p>预约日期：{record.visitDate || record.date || '待确认'} {record.timeSlot || ''}</p>
                      <p>预约校区：{record.campusName || (record.campus === 'east' ? '东校区' : '主校区')}</p>
                      {record.appointmentNo && <p className="text-xs text-gray-400">预约单号：{record.appointmentNo}</p>}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md text-center min-w-[150px]">
                    <p className="text-sm text-gray-500 mb-1">入校核销码</p>
                    <p className="text-xl font-bold text-blue-600">{record.checkInCode || record.verificationCode || 'DP8888'}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="bg-white p-12 rounded-lg shadow-sm">
              <Empty description="未查询到相关预约记录" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
