import { useEffect, useState } from 'react';
import { Card, Empty, Spin } from 'antd';
import SectionTitle from '@/components/SectionTitle';
import { dispatch } from '@/api/dispatcher';

interface TeacherItem {
  name: string;
  title?: string;
  desc?: string;
  avatar?: string;
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从网关获取师资档案
    dispatch('teacher.publicList', {})
      .then((res: any) => {
        if (Array.isArray(res)) {
          setTeachers(res);
        } else if (Array.isArray(res?.data)) {
          setTeachers(res.data);
        } else if (Array.isArray(res?.rows)) {
          setTeachers(res.rows);
        } else {
          setTeachers([]);
        }
      })
      .catch(() => {
        // 请求失败或无接口时设置为空数组，绝不展示假数据
        setTeachers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SectionTitle title="师资团队" subtitle="汇聚教育精英，培养未来栋梁" />

      {loading ? (
        <div className="text-center py-20">
          <Spin size="large" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-xl">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span className="text-gray-500 text-base">暂无公开师资档案，敬请期待</span>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {teachers.map((teacher, index) => (
            <Card
              key={index}
              hoverable
              cover={
                teacher.avatar ? (
                  <img alt={teacher.name} src={teacher.avatar} className="h-48 object-cover w-full" />
                ) : (
                  <div className="bg-gray-100 h-48 flex items-center justify-center text-gray-400">
                    [教师风采]
                  </div>
                )
              }
              className="shadow-sm"
            >
              <Card.Meta
                title={
                  <span className="text-lg">
                    {teacher.name}
                    {teacher.title && (
                      <span className="text-sm font-normal text-blue-500 ml-2">{teacher.title}</span>
                    )}
                  </span>
                }
                description={
                  <span className="text-gray-500 text-sm line-clamp-3">
                    {teacher.desc || '专注学科教学与综合素质培养'}
                  </span>
                }
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
