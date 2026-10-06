import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@ant-design/pro-components';
import { getClientBaseUrl } from '@/utils/env';
import {
  Card,
  Row,
  Col,
  Button,
  Select,
  Tag,
  Space,
  Segmented,
  Tooltip,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Badge,
  Typography,
  Divider,
  Table,
  Radio,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DesktopOutlined,
  TabletOutlined,
  MobileOutlined,
  AppstoreOutlined,
  EditOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  LayoutOutlined,
} from '@ant-design/icons';
import {
  getPages,
  getPageSections,
  savePageSections,
  publishPage,
  savePage,
  deletePage,
} from '@/api/cms/builder';

const { Title, Text, Paragraph } = Typography;

const SECTION_TYPE_MAP: Record<string, { name: string; color: string; desc: string }> = {
  hero: { name: '首屏品牌巨幕', color: 'blue', desc: '首页视觉主图、标语、按钮与招生挂件' },
  results: { name: '办学成效战报看板', color: 'volcano', desc: '提分率、本科率等核心数字看板' },
  intro: { name: '办学理念引言', color: 'geekblue', desc: '学校核心定位与理念阐述' },
  reasons: { name: '办学优势与特色', color: 'purple', desc: '为什么选择华襄四大理由网格' },
  stories: { name: '学子逆袭提分故事', color: 'gold', desc: '真实高分突破学员榜单与心得' },
  faculty: { name: '名师天团聚光灯', color: 'magenta', desc: '特级教师与高三功勋师资推荐' },
  campus: { name: '走进校园与环境指标', color: 'green', desc: '校园实景画廊与占地硬件权威数据' },
  news: { name: '此刻正在发生 (资讯公文)', color: 'cyan', desc: '高招资讯与校园红头公文流' },
  rich_text: { name: '通用富文本 / 介绍', color: 'default', desc: '图文排版、定制通告与说明容器' },
  faq: { name: '常见问答 FAQ', color: 'orange', desc: '招生咨询热点与折叠问答清单' },
};

const DEFAULT_SECTIONS_INIT: Record<string, any> = {
  hero: {
    kicker: 'ONE YEAR. A NEW POSSIBILITY.',
    slogan: '不是复读，是再出发',
    subtitle: '只专注高三。让每一份不甘，都拥有重新抵达的路径。',
    noteYear: '2026',
    noteText: '秋季班招生进行中 · 余位 115\n红砖校园 · 专注高三',
    ctaText: '预约游园 / 诊断 →',
  },
  results: {
    kicker: '2026 RESULTS',
    items: [
      { n: '92.6%', label: '2026 届本科上线率' },
      { n: '+86', label: '平均提分（分）' },
      { n: '318', label: '600 分以上人数' },
      { n: '146', label: '双一流院校录取' },
    ],
  },
  intro: {
    kicker: 'A FOCUSED YEAR',
    title: '用更精准的一年，再攀一程',
    desc: '汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。',
  },
  reasons: {
    kicker: 'WHY HUAXIANG',
    title: '为什么选择华襄四大理由',
    items: [
      { t: '专注高三，全封闭管理', d: '纯高三沉浸式备考场域，排除外界干扰。', to: '/senior-year/teaching' },
      { t: '分层教学，小班精准提分', d: '根据学情深度诊断，精准编入契合层级。', to: '/senior-year/curriculum' },
      { t: '名师执教，功勋高考天团', d: '特级教师领衔把关，平均教龄15年以上。', to: '/faculty/teachers' },
      { t: '心身护航，全程导师陪伴', d: '专属导师每周复盘，专业心理疏导。', to: '/campus-life/wellbeing' },
    ],
  },
  stories: {
    kicker: 'STUDENT STORIES',
    title: '他们，重新抵达',
  },
  faculty: {
    kicker: 'FACULTY SPOTLIGHT',
    title: '特级名师与资深高三功勋团队',
  },
  campus: {
    kicker: 'OUR CAMPUS',
    title: '在足够好的环境里，安心向上',
    statCampus: [
      { n: '130', label: '亩校园面积' },
      { n: '12', label: '万㎡建筑面积' },
      { n: '1100', label: '人千人礼堂' },
      { n: '10', label: '万册图书馆藏' },
    ],
  },
  news: {
    kicker: 'FROM HUAXIANG',
    title: '此刻，正在发生',
  },
  rich_text: {
    title: '新区块标题',
    html: '<p>请在此输入图文正文内容...</p>',
  },
  faq: {
    kicker: 'FREQUENTLY ASKED QUESTIONS',
    title: '高频咨询答疑',
  },
};

const INITIAL_ALL_PAGES = [
  { pageId: 1, pageName: '官网首页', pageSlug: '/', status: '0', seoTitle: '汉外华襄复读中心 - 只专注高三 重新出发' },
  { pageId: 2, pageName: '中心概况', pageSlug: '/about/introduction', status: '0', seoTitle: '办学历程与优势 - 汉外华襄' },
  { pageId: 3, pageName: '办学理念', pageSlug: '/about/philosophy', status: '0', seoTitle: '育人主张与初心 - 汉外华襄' },
  { pageId: 4, pageName: '校园实景', pageSlug: '/about/campuses', status: '0', seoTitle: '走进校园硬件环境 - 汉外华襄' },
  { pageId: 5, pageName: '课程体系', pageSlug: '/senior-year/curriculum', status: '0', seoTitle: '高三科学备考体系 - 汉外华襄' },
  { pageId: 6, pageName: '特色课程', pageSlug: '/senior-year/features', status: '0', seoTitle: '清北领航培优课程 - 汉外华襄' },
  { pageId: 7, pageName: '教学管理', pageSlug: '/senior-year/teaching', status: '0', seoTitle: '精细化作息与日清周结 - 汉外华襄' },
  { pageId: 8, pageName: '学年规划', pageSlug: '/senior-year/planning', status: '0', seoTitle: '三轮冲刺备考规划 - 汉外华襄' },
  { pageId: 9, pageName: '名师天团', pageSlug: '/faculty/teachers', status: '0', seoTitle: '特级名师名录 - 汉外华襄' },
  { pageId: 10, pageName: '教研成果', pageSlug: '/faculty/research', status: '0', seoTitle: '高考命题与校本教研 - 汉外华襄' },
  { pageId: 11, pageName: '日常生活', pageSlug: '/campus-life/daily', status: '0', seoTitle: '寄宿与餐饮作息 - 汉外华襄' },
  { pageId: 12, pageName: '心身护航', pageSlug: '/campus-life/wellbeing', status: '0', seoTitle: '心理辅导与体能 - 汉外华襄' },
  { pageId: 13, pageName: '班型设置', pageSlug: '/admissions/plans', status: '0', seoTitle: '分层编班与班额 - 汉外华襄' },
  { pageId: 14, pageName: '招生简章', pageSlug: '/admissions/guide', status: '0', seoTitle: '招生简章与收费标准 - 汉外华襄' },
  { pageId: 15, pageName: '常见问题', pageSlug: '/admissions/faq', status: '0', seoTitle: '常见问答指南 - 汉外华襄' },
  { pageId: 16, pageName: '预约咨询', pageSlug: '/admissions/consultation', status: '0', seoTitle: '在线预约到校诊断 - 汉外华襄' },
  { pageId: 17, pageName: '新闻资讯', pageSlug: '/news', status: '0', seoTitle: '中心动态官方发文 - 汉外华襄' },
  { pageId: 18, pageName: '高考动态', pageSlug: '/news/gaokao', status: '0', seoTitle: '招考政策与分数复盘 - 汉外华襄' },
];

const PageBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 视图模式：'canvas' (分屏画布设计) | 'list' (全站所有页面列表总览)
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');

  // 状态管理
  const [pages, setPages] = useState<any[]>(INITIAL_ALL_PAGES);
  const [currentPageId, setCurrentPageId] = useState<number>(1);
  const [currentSlug, setCurrentSlug] = useState<string>('/');
  const [currentPageName, setCurrentPageName] = useState<string>('官网首页');
  const [sections, setSections] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 添加新区块弹窗
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newSectionType, setNewSectionType] = useState('rich_text');
  const [newSectionName, setNewSectionName] = useState('自定义图文内容');

  // 新增页面弹窗
  const [createPageModalVisible, setCreatePageModalVisible] = useState(false);
  const [newPageForm] = Form.useForm();

  // 广播草稿给右侧真机画布 (0延迟直达)
  const broadcastToCanvas = (draftSections: any[]) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'CMS_PAGE_PREVIEW_UPDATE',
          payload: {
            pageSlug: currentSlug,
            sections: draftSections,
          },
        },
        '*'
      );
    }
  };

  // 获取页面列表
  const fetchPageList = async () => {
    try {
      const res: any = await getPages();
      const list = res?.rows || res?.data || [];
      if (list.length > 0) {
        setPages(list);
      }
    } catch {
      // 容灾初始
    }
  };

  // 加载当前页面的区块列表
  const fetchSections = async (pageId: number) => {
    try {
      const res: any = await getPageSections(pageId);
      const list = Array.isArray(res?.data) ? res.data : [];
      if (list.length > 0) {
        const parsed = list.map((item: any) => ({
          ...item,
          content: typeof item.contentData === 'string' ? JSON.parse(item.contentData) : item.contentData || {},
        }));
        setSections(parsed);
        setSelectedIndex(0);
        setTimeout(() => broadcastToCanvas(parsed), 300);
        return;
      }
    } catch {
      // fallback
    }

    // 默认首页 8 大基准区块
    const fallbackList = [
      { sectionId: 1, sectionType: 'hero', sectionName: '首屏品牌巨幕', sortOrder: 1, isVisible: 1, content: DEFAULT_SECTIONS_INIT.hero },
      { sectionId: 2, sectionType: 'results', sectionName: '核心办学成效战报看板', sortOrder: 2, isVisible: 1, content: DEFAULT_SECTIONS_INIT.results },
      { sectionId: 3, sectionType: 'intro', sectionName: '办学理念引言', sortOrder: 3, isVisible: 1, content: DEFAULT_SECTIONS_INIT.intro },
      { sectionId: 4, sectionType: 'reasons', sectionName: '四大办学特色', sortOrder: 4, isVisible: 1, content: DEFAULT_SECTIONS_INIT.reasons },
      { sectionId: 5, sectionType: 'stories', sectionName: '学子逆袭提分故事', sortOrder: 5, isVisible: 1, content: DEFAULT_SECTIONS_INIT.stories },
      { sectionId: 6, sectionType: 'faculty', sectionName: '名师天团聚光灯', sortOrder: 6, isVisible: 1, content: DEFAULT_SECTIONS_INIT.faculty },
      { sectionId: 7, sectionType: 'campus', sectionName: '走进校园与环境指标', sortOrder: 7, isVisible: 1, content: DEFAULT_SECTIONS_INIT.campus },
      { sectionId: 8, sectionType: 'news', sectionName: '此刻正在发生 (资讯公文)', sortOrder: 8, isVisible: 1, content: DEFAULT_SECTIONS_INIT.news },
    ];
    setSections(fallbackList);
    setSelectedIndex(0);
    setTimeout(() => broadcastToCanvas(fallbackList), 300);
  };

  useEffect(() => {
    fetchPageList();
  }, []);

  useEffect(() => {
    if (currentPageId) {
      fetchSections(currentPageId);
    }
  }, [currentPageId]);

  // 选择页面跳转设计
  const handleSelectPageToDesign = (record: any) => {
    setCurrentPageId(record.pageId);
    setCurrentSlug(record.pageSlug || '/');
    setCurrentPageName(record.pageName);
    setViewMode('canvas');
  };

  // 上移区块
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...sections];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSections(next);
    setSelectedIndex(index - 1);
    broadcastToCanvas(next);
  };

  // 下移区块
  const handleMoveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const next = [...sections];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setSections(next);
    setSelectedIndex(index + 1);
    broadcastToCanvas(next);
  };

  // 切换可见状态
  const handleToggleVisible = (index: number) => {
    const next = [...sections];
    next[index].isVisible = next[index].isVisible === 1 ? 0 : 1;
    setSections(next);
    broadcastToCanvas(next);
  };

  // 删除区块
  const handleDeleteSection = (index: number) => {
    const next = sections.filter((_, i) => i !== index);
    setSections(next);
    setSelectedIndex(0);
    broadcastToCanvas(next);
  };

  // 添加新区块
  const handleAddSection = () => {
    const template = DEFAULT_SECTIONS_INIT[newSectionType] || {};
    const newSection = {
      pageId: currentPageId,
      sectionType: newSectionType,
      sectionName: newSectionName || SECTION_TYPE_MAP[newSectionType]?.name || '新区块',
      sortOrder: sections.length + 1,
      isVisible: 1,
      content: JSON.parse(JSON.stringify(template)),
    };
    const next = [...sections, newSection];
    setSections(next);
    setSelectedIndex(next.length - 1);
    setAddModalVisible(false);
    broadcastToCanvas(next);
    message.success(`已添加「${newSection.sectionName}」区块`);
  };

  // 修改当前选中区块的字段内容
  const handleUpdateCurrentContent = (field: string, val: any) => {
    const next = [...sections];
    if (!next[selectedIndex]) return;
    next[selectedIndex].content = {
      ...next[selectedIndex].content,
      [field]: val,
    };
    setSections(next);
    broadcastToCanvas(next);
  };

  // 批量保存区块排版
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload = sections.map((sec, idx) => ({
        ...sec,
        pageId: currentPageId,
        sortOrder: idx + 1,
        contentData: JSON.stringify(sec.content || {}),
      }));
      await savePageSections(currentPageId, payload);
      message.success(`「${currentPageName}」所有区块排版与内容已成功保存！`);
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 一键正式发布上线
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await handleSaveAll();
      await publishPage(currentPageId);
      message.success(`「${currentPageName}」已成功发布上线，并实时刷新 Redis 全网缓存！`);
    } catch (e: any) {
      message.error(e.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  // 创建新页面
  const handleCreatePage = async () => {
    try {
      const values = await newPageForm.validateFields();
      await savePage(values);
      message.success('新页面创建成功！');
      setCreatePageModalVisible(false);
      newPageForm.resetFields();
      fetchPageList();
    } catch (e: any) {
      if (e.message) message.error(e.message);
    }
  };

  const currentSection = sections[selectedIndex] || null;

  return (
    <PageContainer
      header={{
        title: '官网全站页面搭建与可视化构建器 (Page Builder)',
        subTitle: '现代化 Block-based 架构：全站每一个页面均可自由拼装排版、0延迟实时真机联动与秒级全网发布',
        tags: <Tag color="green">全站所有页面可编辑</Tag>,
        extra: [
          <Radio.Group
            key="view-toggle"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="canvas">
              <LayoutOutlined /> 真机分屏搭建
            </Radio.Button>
            <Radio.Button value="list">
              <UnorderedListOutlined /> 全站页面列表 ({pages.length})
            </Radio.Button>
          </Radio.Group>,
          <Button
            key="global-btn"
            icon={<AppstoreOutlined />}
            onClick={() => {
              navigate('/cms/global');
            }}
          >
            全局 Header / Footer 设计 ↗
          </Button>,
          <Button
            key="preview-web"
            icon={<GlobalOutlined />}
            onClick={() => window.open(`${getClientBaseUrl()}${currentSlug}`, '_blank')}
          >
            新窗口打开官网
          </Button>,
        ],
      }}
    >
      {/* 视图模式 1：全站页面列表总览 */}
      {viewMode === 'list' && (
        <Card
          title={
            <Space>
              <UnorderedListOutlined />
              <span>全站页面库管理大纲 (已收录 {pages.length} 个官网页面)</span>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreatePageModalVisible(true)}
            >
              新建官网页面
            </Button>
          }
          style={{ borderRadius: 8 }}
        >
          <Table
            rowKey="pageId"
            dataSource={pages}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '页面名称',
                dataIndex: 'pageName',
                render: (text, r) => (
                  <Space>
                    <strong>{text}</strong>
                    {r.pageSlug === '/' && <Tag color="blue">官网首页</Tag>}
                  </Space>
                ),
              },
              {
                title: '访问路由 (Slug)',
                dataIndex: 'pageSlug',
                render: (slug) => <Tag color="geekblue">{slug}</Tag>,
              },
              {
                title: 'SEO 标题',
                dataIndex: 'seoTitle',
                ellipsis: true,
                render: (title) => title || <Text type="secondary">继承全站默认</Text>,
              },
              {
                title: '发布状态',
                dataIndex: 'status',
                render: (status) =>
                  status === '0' ? <Tag color="success">已发布</Tag> : <Tag color="warning">草稿中</Tag>,
              },
              {
                title: '操作',
                render: (_, r) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleSelectPageToDesign(r)}
                    >
                      可视化搭建此页面
                    </Button>
                    <Button
                      size="small"
                      icon={<GlobalOutlined />}
                      onClick={() => window.open(`${getClientBaseUrl()}${r.pageSlug}`, '_blank')}
                    >
                      访问
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* 视图模式 2：沉浸式真机分屏搭建器 */}
      {viewMode === 'canvas' && (
        <>
          {/* 页面切换顶栏 */}
          <Card
            style={{ borderRadius: 8, marginBottom: 16 }}
            styles={{ body: { padding: '12px 20px' } }}
          >
            <Row align="middle" justify="space-between">
              <Col>
                <Space size="middle">
                  <Text strong style={{ fontSize: 14 }}>当前搭建页面：</Text>
                  <Select
                    style={{ width: 260 }}
                    value={currentPageId}
                    onChange={(val) => {
                      setCurrentPageId(val);
                      const p = pages.find((item) => item.pageId === val);
                      if (p) {
                        setCurrentSlug(p.pageSlug || '/');
                        setCurrentPageName(p.pageName);
                      }
                    }}
                    options={pages.map((p) => ({
                      label: `${p.pageName} (${p.pageSlug})`,
                      value: p.pageId,
                    }))}
                  />
                  <Tag color="cyan">路由：{currentSlug}</Tag>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSaveAll}
                  >
                    保存区块草稿
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={publishing}
                    onClick={handlePublish}
                  >
                    发布上线到全网
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={16}>
            {/* 左侧：区块排版流与属性编辑 */}
            <Col xs={24} lg={10} xl={9}>
              <Card
                title={
                  <Space>
                    <AppstoreOutlined />
                    <span>区块排版流 ({sections.length} 个区块)</span>
                  </Space>
                }
                extra={
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalVisible(true)}
                  >
                    添加新区块
                  </Button>
                }
                style={{ borderRadius: 8, marginBottom: 16 }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                  点击上下箭头自由排序；点击任一区块即在下方编辑对应内容与数据：
                </Paragraph>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                  {sections.map((sec, idx) => {
                    const info = SECTION_TYPE_MAP[sec.sectionType] || { name: sec.sectionType, color: 'default', desc: '' };
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 6,
                          border: isSelected ? '2px solid #1677ff' : '1px solid #e2e8f0',
                          background: isSelected ? '#eff6ff' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Space>
                          <Badge count={idx + 1} style={{ backgroundColor: isSelected ? '#1677ff' : '#94a3b8' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                              {sec.sectionName}
                              <Tag color={info.color} style={{ marginLeft: 8, fontSize: 11 }}>
                                {info.name}
                              </Tag>
                            </div>
                            {sec.isVisible === 0 && <Tag color="error">已隐藏</Tag>}
                          </div>
                        </Space>

                        <Space onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="上移">
                            <Button
                              size="small"
                              type="text"
                              icon={<ArrowUpOutlined />}
                              disabled={idx === 0}
                              onClick={() => handleMoveUp(idx)}
                            />
                          </Tooltip>
                          <Tooltip title="下移">
                            <Button
                              size="small"
                              type="text"
                              icon={<ArrowDownOutlined />}
                              disabled={idx === sections.length - 1}
                              onClick={() => handleMoveDown(idx)}
                            />
                          </Tooltip>
                          <Tooltip title={sec.isVisible === 1 ? '隐藏该区块' : '显示该区块'}>
                            <Button
                              size="small"
                              type="text"
                              icon={sec.isVisible === 1 ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                              onClick={() => handleToggleVisible(idx)}
                            />
                          </Tooltip>
                          <Popconfirm title="确认删除此区块？" onConfirm={() => handleDeleteSection(idx)}>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* 选中区块的专属属性编辑区 */}
              {currentSection && (
                <Card
                  title={
                    <Space>
                      <EditOutlined />
                      <span>编辑区块内容：{currentSection.sectionName}</span>
                    </Space>
                  }
                  style={{ borderRadius: 8 }}
                  styles={{ body: { padding: '16px 20px' } }}
                >
                  <Form layout="vertical">
                    <Form.Item label="区块别名">
                      <Input
                        value={currentSection.sectionName}
                        onChange={(e) => {
                          const next = [...sections];
                          next[selectedIndex].sectionName = e.target.value;
                          setSections(next);
                        }}
                      />
                    </Form.Item>

                    {/* Hero 属性 */}
                    {currentSection.sectionType === 'hero' && (
                      <>
                        <Form.Item label="前导标语 (Kicker)">
                          <Input
                            value={currentSection.content?.kicker}
                            onChange={(e) => handleUpdateCurrentContent('kicker', e.target.value)}
                            placeholder="例如: ONE YEAR. A NEW POSSIBILITY."
                          />
                        </Form.Item>
                        <Form.Item label="主标语 (Slogan) - 支持换行与逗号自动斜体">
                          <Input.TextArea
                            rows={2}
                            value={currentSection.content?.slogan}
                            onChange={(e) => handleUpdateCurrentContent('slogan', e.target.value)}
                            placeholder="例如: 不是复读，是再出发"
                          />
                        </Form.Item>
                        <Form.Item label="办学理念副标题">
                          <Input.TextArea
                            rows={2}
                            value={currentSection.content?.subtitle}
                            onChange={(e) => handleUpdateCurrentContent('subtitle', e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="主行动按钮文字">
                          <Input
                            value={currentSection.content?.ctaText}
                            onChange={(e) => handleUpdateCurrentContent('ctaText', e.target.value)}
                          />
                        </Form.Item>
                      </>
                    )}

                    {/* Results 战报看板 */}
                    {currentSection.sectionType === 'results' && (
                      <>
                        <Form.Item label="前导标语 (Kicker)">
                          <Input
                            value={currentSection.content?.kicker}
                            onChange={(e) => handleUpdateCurrentContent('kicker', e.target.value)}
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          核心指标项列表 (实时同步右侧看板):
                        </Text>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(currentSection.content?.items || []).map((it: any, i: number) => (
                            <Row gutter={8} key={i}>
                              <Col span={10}>
                                <Input
                                  value={it.n}
                                  placeholder="数值"
                                  style={{ fontWeight: 'bold' }}
                                  onChange={(e) => {
                                    const items = [...(currentSection.content?.items || [])];
                                    items[i].n = e.target.value;
                                    handleUpdateCurrentContent('items', items);
                                  }}
                                />
                              </Col>
                              <Col span={12}>
                                <Input
                                  value={it.label}
                                  placeholder="说明"
                                  onChange={(e) => {
                                    const items = [...(currentSection.content?.items || [])];
                                    items[i].label = e.target.value;
                                    handleUpdateCurrentContent('items', items);
                                  }}
                                />
                              </Col>
                              <Col span={2}>
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    const items = (currentSection.content?.items || []).filter((_: any, idx: number) => idx !== i);
                                    handleUpdateCurrentContent('items', items);
                                  }}
                                />
                              </Col>
                            </Row>
                          ))}
                          <Button
                            size="small"
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const items = [...(currentSection.content?.items || []), { n: '100%', label: '新指标' }];
                              handleUpdateCurrentContent('items', items);
                            }}
                          >
                            新增指标项
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Campus 校园环境指标 */}
                    {currentSection.sectionType === 'campus' && (
                      <>
                        <Form.Item label="板块标题">
                          <Input
                            value={currentSection.content?.title}
                            onChange={(e) => handleUpdateCurrentContent('title', e.target.value)}
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          校园硬件硬实力指标项 (如 130 亩校园面积):
                        </Text>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(currentSection.content?.statCampus || []).map((it: any, i: number) => (
                            <Row gutter={8} key={i}>
                              <Col span={10}>
                                <Input
                                  value={it.n}
                                  placeholder="数值"
                                  style={{ fontWeight: 'bold' }}
                                  onChange={(e) => {
                                    const items = [...(currentSection.content?.statCampus || [])];
                                    items[i].n = e.target.value;
                                    handleUpdateCurrentContent('statCampus', items);
                                  }}
                                />
                              </Col>
                              <Col span={12}>
                                <Input
                                  value={it.label}
                                  placeholder="单位说明"
                                  onChange={(e) => {
                                    const items = [...(currentSection.content?.statCampus || [])];
                                    items[i].label = e.target.value;
                                    handleUpdateCurrentContent('statCampus', items);
                                  }}
                                />
                              </Col>
                              <Col span={2}>
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    const items = (currentSection.content?.statCampus || []).filter((_: any, idx: number) => idx !== i);
                                    handleUpdateCurrentContent('statCampus', items);
                                  }}
                                />
                              </Col>
                            </Row>
                          ))}
                          <Button
                            size="small"
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const items = [...(currentSection.content?.statCampus || []), { n: '100', label: '亩校园面积' }];
                              handleUpdateCurrentContent('statCampus', items);
                            }}
                          >
                            新增硬件指标项
                          </Button>
                        </div>
                      </>
                    )}

                    {/* 通用标题与描述 */}
                    {['intro', 'stories', 'faculty', 'news', 'faq'].includes(currentSection.sectionType) && (
                      <>
                        <Form.Item label="前导标语 (Kicker)">
                          <Input
                            value={currentSection.content?.kicker}
                            onChange={(e) => handleUpdateCurrentContent('kicker', e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="主标题">
                          <Input
                            value={currentSection.content?.title}
                            onChange={(e) => handleUpdateCurrentContent('title', e.target.value)}
                          />
                        </Form.Item>
                        {currentSection.content?.desc !== undefined && (
                          <Form.Item label="正文描述">
                            <Input.TextArea
                              rows={3}
                              value={currentSection.content?.desc}
                              onChange={(e) => handleUpdateCurrentContent('desc', e.target.value)}
                            />
                          </Form.Item>
                        )}
                      </>
                    )}

                    {/* 富文本 */}
                    {currentSection.sectionType === 'rich_text' && (
                      <>
                        <Form.Item label="大标题">
                          <Input
                            value={currentSection.content?.title}
                            onChange={(e) => handleUpdateCurrentContent('title', e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="HTML / 正文内容">
                          <Input.TextArea
                            rows={6}
                            value={currentSection.content?.html || currentSection.content?.content}
                            onChange={(e) => handleUpdateCurrentContent('html', e.target.value)}
                          />
                        </Form.Item>
                      </>
                    )}
                  </Form>
                </Card>
              )}
            </Col>

            {/* 右侧：真机响应式全景画布 (Live Canvas) */}
            <Col xs={24} lg={14} xl={15}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                      <DesktopOutlined />
                      <span style={{ fontWeight: 600 }}>真机实时全景画布</span>
                      <Tag color="cyan">0ms 双向热联动</Tag>
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
                        iframeRef.current.src = `${getClientBaseUrl()}${currentSlug}?preview=true&t=${Date.now()}`;
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
                    src={`${getClientBaseUrl()}${currentSlug}?preview=true`}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    onLoad={() => {
                      broadcastToCanvas(sections);
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* 添加新区块弹窗 */}
      <Modal
        title={`添加新区块到「${currentPageName}」`}
        open={addModalVisible}
        onOk={handleAddSection}
        onCancel={() => setAddModalVisible(false)}
        okText="确认添加"
        cancelText="取消"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="选择区块类型" required>
            <Select
              value={newSectionType}
              onChange={(val) => {
                setNewSectionType(val);
                setNewSectionName(SECTION_TYPE_MAP[val]?.name || '新区块');
              }}
              options={Object.entries(SECTION_TYPE_MAP).map(([key, item]) => ({
                label: `${item.name} (${item.desc})`,
                value: key,
              }))}
            />
          </Form.Item>
          <Form.Item label="区块别名">
            <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建页面弹窗 */}
      <Modal
        title="新建官网页面"
        open={createPageModalVisible}
        onOk={handleCreatePage}
        onCancel={() => setCreatePageModalVisible(false)}
        okText="创建页面"
        cancelText="取消"
      >
        <Form form={newPageForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="pageName"
            label="页面中文名称"
            rules={[{ required: true, message: '请输入页面名称' }]}
          >
            <Input placeholder="例如: 校园开放日专题" />
          </Form.Item>
          <Form.Item
            name="pageSlug"
            label="访问路由 Slug"
            rules={[{ required: true, message: '请输入访问路由 (如 /open-day)' }]}
          >
            <Input placeholder="例如: /open-day" />
          </Form.Item>
          <Form.Item name="seoTitle" label="SEO 页面标题">
            <Input placeholder="例如: 2026 校园开放日预约 - 汉外华襄" />
          </Form.Item>
          <Form.Item name="seoDescription" label="SEO 页面描述">
            <Input.TextArea rows={2} placeholder="搜索引擎检索展示简述..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PageBuilderPage;
