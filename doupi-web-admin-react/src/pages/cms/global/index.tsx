import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@ant-design/pro-components';
import { getClientBaseUrl } from '@/utils/env';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Input,
  Tabs,
  Space,
  Tag,
  Segmented,
  message,
  Typography,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  GlobalOutlined,
  DesktopOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { getGlobalConfig, saveGlobalConfig } from '@/api/cms/builder';

const { Title, Text, Paragraph } = Typography;

const DEFAULT_HEADER = {
  brand: {
    name: '汉外华襄复读中心',
    nameEn: 'HUAXIANG SENIOR YEAR CENTER',
    mark: '华',
  },
  nav: [
    { title: '首页', slug: '', path: '/' },
    {
      title: '关于华襄',
      slug: 'about',
      path: '/about',
      children: [
        { title: '中心概况', slug: 'introduction', path: '/about/introduction', desc: '办学历程与核心优势' },
        { title: '办学理念', slug: 'philosophy', path: '/about/philosophy', desc: '教育初心与育人主张' },
        { title: '校园环境', slug: 'campuses', path: '/about/campuses', desc: '独立校区与生活硬件' },
      ],
    },
    {
      title: '高三学年',
      slug: 'senior-year',
      path: '/senior-year',
      children: [
        { title: '课程体系', slug: 'curriculum', path: '/senior-year/curriculum', desc: '新高考科学备考方案' },
        { title: '特色课程', slug: 'features', path: '/senior-year/features', desc: '清北领航与个性化培优' },
        { title: '教学管理', slug: 'teaching', path: '/senior-year/teaching', desc: '精细化时间与作息规范' },
        { title: '学年规划', slug: 'planning', path: '/senior-year/planning', desc: '三轮备考关键节点' },
      ],
    },
    {
      title: '名师天团',
      slug: 'faculty',
      path: '/faculty',
      children: [
        { title: '师资概览', slug: '', path: '/faculty', desc: '名师阵容与学科梯队' },
        { title: '教师名录', slug: 'teachers', path: '/faculty/teachers', desc: '特级教师与教研首席' },
        { title: '教研成果', slug: 'research', path: '/faculty/research', desc: '高考命题与校本题库' },
      ],
    },
    {
      title: '校园生活',
      slug: 'campus-life',
      path: '/campus-life',
      children: [
        { title: '日常生活', slug: 'daily', path: '/campus-life/daily', desc: '寄宿作息与餐饮保障' },
        { title: '心身护航', slug: 'wellbeing', path: '/campus-life/wellbeing', desc: '心理疏导与体育锻炼' },
      ],
    },
    {
      title: '招生录取',
      slug: 'admissions',
      path: '/admissions',
      children: [
        { title: '招生总览', slug: '', path: '/admissions', desc: '招生政策与流程' },
        { title: '班型设置', slug: 'plans', path: '/admissions/plans', desc: '分层教学与班额标准' },
        { title: '招生简章', slug: 'guide', path: '/admissions/guide', desc: '报名条件与收费明细' },
        { title: '常见问题', slug: 'faq', path: '/admissions/faq', desc: '招生咨询热点答疑' },
        { title: '预约咨询', slug: 'consultation', path: '/admissions/consultation', desc: '在线预约与到校访校' },
      ],
    },
    {
      title: '高考资讯',
      slug: 'news',
      path: '/news',
      children: [
        { title: '新闻资讯', slug: '', path: '/news', desc: '中心动态与官方发文' },
        { title: '高考动态', slug: 'gaokao', path: '/news/gaokao', desc: '招考政策与分数分析' },
      ],
    },
  ],
  quickActions: [
    { title: '预约游园 / 诊断', href: '/admissions/consultation', type: 'primary' },
  ],
};

const DEFAULT_FOOTER = {
  cta: {
    kicker: 'VISIT US / 来校园走一走',
    title: '重新出发，\n从一次到访开始。',
    buttonText: '预约游园 / 诊断',
  },
  brand: {
    name: '汉外华襄复读中心',
    nameEn: 'HUAXIANG SENIOR YEAR CENTER',
    slogan: '只为高三，再出发的这一年。\n全封闭管理 · 小班分层 · 名师执教',
    address: '武汉市江夏区武汉海淀外国语实验学校（北门）',
    hotlines: ['027-81777887', '027-81777838'],
    admissionsLine: '400-0000-000',
    officeHours: '周一至周日 8:30 — 17:30',
  },
  copyright: '© 2026 汉外华襄复读中心 · 版权所有',
  icp: '鄂ICP备20260930号-1',
};

const GlobalLayoutPage: React.FC = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [headerForm] = Form.useForm();
  const [footerForm] = Form.useForm();

  const [headerData, setHeaderData] = useState<any>(DEFAULT_HEADER);
  const [footerData, setFooterData] = useState<any>(DEFAULT_FOOTER);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // 向真机画布广播实时修改
  const broadcastGlobal = (category: string, content: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'CMS_GLOBAL_PREVIEW_UPDATE',
          payload: { category, content },
        },
        '*'
      );
    }
  };

  const loadData = async () => {
    try {
      const hRes: any = await getGlobalConfig('header');
      if (hRes && hRes.data && hRes.data.configContent) {
        const parsed = typeof hRes.data.configContent === 'string' ? JSON.parse(hRes.data.configContent) : hRes.data.configContent;
        setHeaderData(parsed);
        headerForm.setFieldsValue({
          name: parsed.brand?.name,
          nameEn: parsed.brand?.nameEn,
          mark: parsed.brand?.mark,
          ctaText: parsed.quickActions?.[0]?.title,
        });
      } else {
        headerForm.setFieldsValue({
          name: DEFAULT_HEADER.brand.name,
          nameEn: DEFAULT_HEADER.brand.nameEn,
          mark: DEFAULT_HEADER.brand.mark,
          ctaText: DEFAULT_HEADER.quickActions[0].title,
        });
      }

      const fRes: any = await getGlobalConfig('footer');
      if (fRes && fRes.data && fRes.data.configContent) {
        const parsed = typeof fRes.data.configContent === 'string' ? JSON.parse(fRes.data.configContent) : fRes.data.configContent;
        setFooterData(parsed);
        footerForm.setFieldsValue({
          ctaTitle: parsed.cta?.title,
          ctaButton: parsed.cta?.buttonText,
          slogan: parsed.brand?.slogan,
          address: parsed.brand?.address,
          hotlines: Array.isArray(parsed.brand?.hotlines) ? parsed.brand.hotlines.join(', ') : parsed.brand?.hotlines,
          admissionsLine: parsed.brand?.admissionsLine,
          officeHours: parsed.brand?.officeHours,
          icp: parsed.icp,
          copyright: parsed.copyright,
        });
      } else {
        footerForm.setFieldsValue({
          ctaTitle: DEFAULT_FOOTER.cta.title,
          ctaButton: DEFAULT_FOOTER.cta.buttonText,
          slogan: DEFAULT_FOOTER.brand.slogan,
          address: DEFAULT_FOOTER.brand.address,
          hotlines: DEFAULT_FOOTER.brand.hotlines.join(', '),
          admissionsLine: DEFAULT_FOOTER.brand.admissionsLine,
          officeHours: DEFAULT_FOOTER.brand.officeHours,
          icp: DEFAULT_FOOTER.icp,
          copyright: DEFAULT_FOOTER.copyright,
        });
      }
    } catch {
      // 容灾初始化
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存 Header
  const handleSaveHeader = async () => {
    setSaving(true);
    try {
      await saveGlobalConfig({
        category: 'header',
        configContent: JSON.stringify(headerData),
        remark: '官网全站顶部导航与品牌配置',
      });
      message.success('全站顶部导航与品牌配置已成功保存并同步！');
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 保存 Footer
  const handleSaveFooter = async () => {
    setSaving(true);
    try {
      await saveGlobalConfig({
        category: 'footer',
        configContent: JSON.stringify(footerData),
        remark: '官网全站底部页脚与联系信息配置',
      });
      message.success('全站底部页脚配置已成功保存并同步！');
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '官网全站公共布局设计器 (Header & Footer)',
        subTitle: '全局单例管理：全站每个页面的顶部导航菜单树、品牌标识、底部页脚、联系专线均在此统一驱动',
        tags: <Tag color="blue">全站实时生效</Tag>,
        extra: [
          <Button
            key="builder-btn"
            type="dashed"
            onClick={() => {
              navigate('/cms/builder');
            }}
          >
            返回页面搭建器 ↗
          </Button>,
          <Button
            key="preview-btn"
            icon={<GlobalOutlined />}
            onClick={() => window.open(getClientBaseUrl(), '_blank')}
          >
            新窗口打开官网
          </Button>,
          <Button key="reload-btn" icon={<ReloadOutlined />} onClick={loadData}>
            重置刷新
          </Button>,
        ],
      }}
    >
      <Row gutter={16}>
        <Col xs={24} lg={12} xl={11}>
          <Card style={{ borderRadius: 8 }}>
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: '1',
                  label: '顶部 Header 导航',
                  children: (
                    <div>
                      <Form
                        form={headerForm}
                        layout="vertical"
                        onValuesChange={(_, all) => {
                          const next = {
                            ...headerData,
                            brand: {
                              ...headerData.brand,
                              name: all.name ?? headerData.brand?.name,
                              nameEn: all.nameEn ?? headerData.brand?.nameEn,
                              mark: all.mark ?? headerData.brand?.mark,
                            },
                            quickActions: [
                              { title: all.ctaText || '预约游园 / 诊断', href: '/admissions/consultation', type: 'primary' },
                            ],
                          };
                          setHeaderData(next);
                          broadcastGlobal('header', next);
                        }}
                      >
                        <Title level={5} style={{ marginBottom: 16 }}>品牌标识与标准字</Title>
                        <Row gutter={12}>
                          <Col span={10}>
                            <Form.Item name="name" label="学校全称" required>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={10}>
                            <Form.Item name="nameEn" label="英文标准字头" required>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="mark" label="微标单字">
                              <Input maxLength={1} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item name="ctaText" label="顶部主行动按钮文案">
                          <Input />
                        </Form.Item>

                        <Divider />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Title level={5} style={{ margin: 0 }}>全站导航菜单树结构 ({headerData.nav?.length || 0} 个大栏目)</Title>
                        </div>
                        <Paragraph type="secondary" style={{ fontSize: 12 }}>
                          涵盖首页与 6 大栏目。前端 Header 将根据以下配置动态生成悬浮下拉菜单：
                        </Paragraph>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                          {(headerData.nav || []).map((item: any, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: 6,
                                padding: '10px 14px',
                                background: '#f8fafc',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <Tag color="blue">{idx + 1}</Tag>
                                  <strong style={{ fontSize: 14 }}>{item.title}</strong>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{item.path}</Text>
                                </Space>
                                <Tag color="geekblue">{item.children ? `${item.children.length} 个子页面` : '直达链接'}</Tag>
                              </div>

                              {item.children && (
                                <div style={{ marginTop: 8, paddingLeft: 24, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {item.children.map((sub: any, sIdx: number) => (
                                    <Tag key={sIdx} color="default" style={{ padding: '2px 8px' }}>
                                      {sub.title} ({sub.path})
                                    </Tag>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: 20 }}>
                          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveHeader} block>
                            保存顶部 Header 配置
                          </Button>
                        </div>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: '2',
                  label: '底部 Footer 页脚',
                  children: (
                    <div>
                      <Form
                        form={footerForm}
                        layout="vertical"
                        onValuesChange={(_, all) => {
                          const next = {
                            ...footerData,
                            cta: {
                              ...footerData.cta,
                              title: all.ctaTitle ?? footerData.cta?.title,
                              buttonText: all.ctaButton ?? footerData.cta?.buttonText,
                            },
                            brand: {
                              ...footerData.brand,
                              slogan: all.slogan ?? footerData.brand?.slogan,
                              address: all.address ?? footerData.brand?.address,
                              hotlines: all.hotlines ? all.hotlines.split(',').map((s: string) => s.trim()) : footerData.brand?.hotlines,
                              admissionsLine: all.admissionsLine ?? footerData.brand?.admissionsLine,
                              officeHours: all.officeHours ?? footerData.brand?.officeHours,
                            },
                            icp: all.icp ?? footerData.icp,
                            copyright: all.copyright ?? footerData.copyright,
                          };
                          setFooterData(next);
                          broadcastGlobal('footer', next);
                        }}
                      >
                        <Title level={5} style={{ marginBottom: 16 }}>底部来访引导 CTA 栏</Title>
                        <Form.Item name="ctaTitle" label="来访大标题 (支持换行)">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name="ctaButton" label="预约按钮文字">
                          <Input />
                        </Form.Item>

                        <Divider />

                        <Title level={5} style={{ marginBottom: 16 }}>学校联系与官方服务专区</Title>
                        <Form.Item name="slogan" label="办学理念与标语">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name="address" label="详细校区地址">
                          <Input />
                        </Form.Item>
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item name="hotlines" label="官方咨询热线 (逗号分隔)">
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="admissionsLine" label="全国招生专线">
                              <Input />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item name="officeHours" label="接待时段">
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="icp" label="工信部 ICP 备案号">
                              <Input />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="copyright" label="全站版权声明">
                          <Input />
                        </Form.Item>

                        <div style={{ marginTop: 20 }}>
                          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveFooter} block>
                            保存底部 Footer 配置
                          </Button>
                        </div>
                      </Form>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* 右侧：实时全景真机画布 */}
        <Col xs={24} lg={12} xl={13}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Space>
                  <DesktopOutlined />
                  <span style={{ fontWeight: 600 }}>真机实时画布</span>
                  <Tag color="cyan">全站全局联动</Tag>
                </Space>
                <Segmented
                  value={device}
                  onChange={(val) => setDevice(val as any)}
                  options={[
                    { label: '🖥️ 桌面 (100%)', value: 'desktop' },
                    { label: '📱 平板 (768px)', value: 'tablet' },
                    { label: '📲 手机 (375px)', value: 'mobile' },
                  ]}
                />
              </div>
            }
            extra={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.src = `${getClientBaseUrl()}/?preview=true&t=${Date.now()}`;
                  }
                }}
              >
                刷新画布
              </Button>
            }
            style={{ borderRadius: 8, overflow: 'hidden' }}
            styles={{
              body: {
                padding: 0,
                background: '#0f172a',
                display: 'flex',
                justifyContent: 'center',
                minHeight: 740,
                overflow: 'hidden',
              },
            }}
          >
            <div
              style={{
                width: device === 'desktop' ? '100%' : device === 'tablet' ? 768 : 375,
                height: 740,
                transition: 'width 0.3s ease',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                background: '#fff',
              }}
            >
              <iframe
                ref={iframeRef}
                src={`${getClientBaseUrl()}/?preview=true`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default GlobalLayoutPage;
