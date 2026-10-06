import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Switch, Select, message } from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  RollbackOutlined,
  DashboardOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  TrophyOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { getCelebrationList, getCelebrationSummary, getCelebrationBatches } from '../../api/screen';
import bgImage from '../../assets/images/celebration-bg.jpg';
import './styles/celebration.css';

interface CelebrationItem {
  id?: number;
  studentName: string;
  maskedName?: string;
  subject?: string;
  beforeScore?: number | null;
  afterScore: number;
  upgradeScore: number;
  batchTitle?: string;
}

interface CelebrationSummary {
  totalCount: number;
  maxUpgrade: number;
  avgUpgrade: number;
  countAbove600: number;
  countUpgradeOver100: number;
}

export const CelebrationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContent1Ref = useRef<HTMLDivElement>(null);
  const scrollContent2Ref = useRef<HTMLDivElement>(null);

  const [schoolTitle] = useState('汉外华襄高复');
  const [batchTitle, setBatchTitle] = useState('高考提分光荣榜');
  const [batchOptions, setBatchOptions] = useState<Array<{ label: string; value: string; totalCount?: number }>>([]);
  const [currentBatch, setCurrentBatch] = useState<string>('__ALL__');
  const [showUpgrade, setShowUpgrade] = useState(true);
  const [useMaskedName, setUseMaskedName] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(0.6);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(true);

  const [displayList, setDisplayList] = useState<CelebrationItem[]>([]);
  const [summary, setSummary] = useState<CelebrationSummary>({
    totalCount: 0,
    maxUpgrade: 0,
    avgUpgrade: 0,
    countAbove600: 0,
    countUpgradeOver100: 0
  });

  // 自动轮播状态
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateInterval, setRotateInterval] = useState(20);
  const autoRotateTimerRef = useRef<any>(null);

  const scrollPosYRef = useRef<number>(60);
  const animFrameIdRef = useRef<number | null>(null);

  const fallbackList: CelebrationItem[] = [
    { studentName: '刘宇宸', maskedName: '刘*宸', subject: '物化生', beforeScore: 480, afterScore: 616.5, upgradeScore: 194.0 },
    { studentName: '周运哲', maskedName: '周*哲', subject: '历政地', beforeScore: 397, afterScore: 560.5, upgradeScore: 163.5 },
    { studentName: '张浡萱', maskedName: '张*萱', subject: '物化地', beforeScore: 437, afterScore: 572.5, upgradeScore: 135.5 },
    { studentName: '周锦添', maskedName: '周*添', subject: '历政地', beforeScore: 322, afterScore: 453.0, upgradeScore: 131.0 },
    { studentName: '周千凯', maskedName: '周*凯', subject: '物化生', beforeScore: 330, afterScore: 453.0, upgradeScore: 123.0 },
    { studentName: '夏汉民', maskedName: '夏*民', subject: '物化生', beforeScore: 352, afterScore: 469.0, upgradeScore: 117.0 },
    { studentName: '刘佳沁', maskedName: '刘*沁', subject: '物化生', beforeScore: 421, afterScore: 538.5, upgradeScore: 117.5 },
    { studentName: '曹轶凡', maskedName: '曹*凡', subject: '物化生', beforeScore: 414, afterScore: 520.5, upgradeScore: 106.5 },
    { studentName: '王傲', maskedName: '王*', subject: '物化地', beforeScore: 524, afterScore: 629.5, upgradeScore: 105.5 },
    { studentName: '张靖宇', maskedName: '张*宇', subject: '物化生', beforeScore: 526, afterScore: 631.5, upgradeScore: 105.5 },
    { studentName: '董鼎坤', maskedName: '董*坤', subject: '物化生', beforeScore: 484, afterScore: 588.0, upgradeScore: 104.0 },
    { studentName: '邹欣', maskedName: '邹*', subject: '物化生', beforeScore: 414, afterScore: 516.5, upgradeScore: 102.5 },
    { studentName: '魏禾', maskedName: '魏*', subject: '物化生', beforeScore: 561, afterScore: 662.5, upgradeScore: 101.5 },
    { studentName: '李小帅', maskedName: '李*帅', subject: '物化生', beforeScore: 587, afterScore: 682.5, upgradeScore: 95.5 },
    { studentName: '刘宇澄', maskedName: '刘*澄', subject: '物化生', beforeScore: 515, afterScore: 610.5, upgradeScore: 95.5 },
    { studentName: '吕英韬', maskedName: '吕*韬', subject: '物化生', beforeScore: 556, afterScore: 648.5, upgradeScore: 92.5 },
    { studentName: '翁成功', maskedName: '翁*功', subject: '物化生', beforeScore: 595, afterScore: 685.5, upgradeScore: 90.5 },
    { studentName: '陈沐金灿', maskedName: '陈**灿', subject: '物化生', beforeScore: 566, afterScore: 654.0, upgradeScore: 88.0 },
    { studentName: '丁钰禛', maskedName: '丁*禛', subject: '历政地', beforeScore: 471, afterScore: 558.0, upgradeScore: 87.0 },
    { studentName: '张恩哲', maskedName: '张*哲', subject: '物化生', beforeScore: 356, afterScore: 441.0, upgradeScore: 85.0 },
    { studentName: '向文越', maskedName: '向*越', subject: '物生地', beforeScore: 345, afterScore: 429.5, upgradeScore: 84.5 },
    { studentName: '余畅睿', maskedName: '余*睿', subject: '物化生', beforeScore: 395, afterScore: 478.5, upgradeScore: 83.5 },
    { studentName: '刘阔', maskedName: '刘*', subject: '物化生', beforeScore: 510, afterScore: 591.5, upgradeScore: 81.5 },
    { studentName: '袁辰宇', maskedName: '袁*宇', subject: '物生政', beforeScore: 450, afterScore: 530.5, upgradeScore: 80.5 }
  ];

  const mask = (name: string) => {
    if (!name) return '';
    if (name.length === 2) return name[0] + '*';
    if (name.length > 2) return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    return name;
  };

  // 竖排榜单标题字符渲染：将数字包裹独立 class，精准控制数字视觉大小使其与汉字完全一致
  const renderVerticalBatchTitle = (title: string) => {
    return Array.from(title || '').map((char, index) => {
      const isFullWidth = /[０-９]/.test(char);
      const isHalfWidth = /[0-9]/.test(char);
      if (isFullWidth || isHalfWidth) {
        const normalizedDigit = isFullWidth
          ? String.fromCharCode(char.charCodeAt(0) - 0xfee0)
          : char;
        return (
          <span key={index} className="title-char title-digit">
            {normalizedDigit}
          </span>
        );
      }
      return (
        <span key={index} className="title-char">
          {char}
        </span>
      );
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
        // 全屏模式下默认收起控制栏，保持大屏纯净展示
        setControlsHidden(true);
      }).catch(() => {
        message.warning('当前环境不支持全屏切换');
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // 根据选中的考试批次加载数据
  const loadBatchData = async (targetBatch: string) => {
    const isAll = !targetBatch || targetBatch === '__ALL__';
    const queryParam = isAll ? undefined : { batchTitle: targetBatch };
    const summaryParam = isAll ? undefined : targetBatch;

    try {
      // 1. 获取对应考试的学子榜单列表
      const listRes: any = await getCelebrationList(queryParam);
      const list = listRes.data || (Array.isArray(listRes) ? listRes : []);
      if (list && list.length > 0) {
        setDisplayList(list);
        if (!isAll) {
          setBatchTitle(targetBatch);
        } else {
          setBatchTitle(list[0]?.batchTitle || '高考卓越提分榜');
        }
      } else {
        if (!isAll) {
          setBatchTitle(targetBatch);
          setDisplayList([]);
        } else {
          setDisplayList(fallbackList);
          setBatchTitle('高考提分光荣榜');
        }
      }
    } catch {
      if (isAll) {
        setDisplayList(fallbackList);
        setBatchTitle('高考提分光荣榜');
      } else {
        setDisplayList([]);
      }
    }

    try {
      // 2. 获取该场考试的专属统计摘要
      const sumRes: any = await getCelebrationSummary(summaryParam);
      const d = sumRes.data || sumRes;
      if (d && (d.totalCount > 0 || d.maxUpgrade > 0)) {
        setSummary({
          totalCount: Number(d.totalCount || 0),
          maxUpgrade: Number(d.maxUpgrade || 0),
          avgUpgrade: Number(d.avgUpgrade || 0),
          countAbove600: Number(d.countAbove600 || 0),
          countUpgradeOver100: Number(d.countUpgradeOver100 || 0)
        });
      } else if (isAll) {
        setSummary({
          totalCount: 24,
          maxUpgrade: 194.0,
          avgUpgrade: 78.5,
          countAbove600: 49,
          countUpgradeOver100: 16
        });
      } else {
        setSummary({
          totalCount: 0,
          maxUpgrade: 0,
          avgUpgrade: 0,
          countAbove600: 0,
          countUpgradeOver100: 0
        });
      }
    } catch {
      // 忽略统计异常
    }

    // 重置无缝滚动起点到顶部
    scrollPosYRef.current = 60;
  };

  const handleBatchChange = (val: string) => {
    setCurrentBatch(val);
    if (val && val !== '__ALL__') {
      setSearchParams({ batchTitle: val });
      message.success(`已切换至【${val}】提分榜`);
    } else {
      setSearchParams({});
      message.success('已切换至【全校考试总榜】');
    }
    loadBatchData(val);
  };

  // 自动轮巡播放定时器
  useEffect(() => {
    if (!autoRotate || batchOptions.length <= 1) {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }
      return;
    }

    autoRotateTimerRef.current = setInterval(() => {
      setBatchOptions((prevOptions) => {
        if (!prevOptions || prevOptions.length <= 1) return prevOptions;
        setCurrentBatch((prevCur) => {
          const idx = prevOptions.findIndex((opt) => opt.value === prevCur);
          const nextIdx = (idx + 1) % prevOptions.length;
          const nextVal = prevOptions[nextIdx].value;
          loadBatchData(nextVal);
          return nextVal;
        });
        return prevOptions;
      });
    }, rotateInterval * 1000);

    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }
    };
  }, [autoRotate, rotateInterval, batchOptions]);

  useEffect(() => {
    // 1. 获取所有考试批次列表
    getCelebrationBatches().then((res: any) => {
      const batches: any[] = res.data || [];
      const options = [
        { label: '🌟 全部考试 (全员总榜)', value: '__ALL__' },
        ...batches.map((b: any) => ({
          label: `🏆 ${b.batchTitle} (${b.totalCount || 0}人)`,
          value: b.batchTitle,
          totalCount: b.totalCount,
        }))
      ];
      setBatchOptions(options);

      // 检查 URL 是否指定了批次
      const urlBatch = searchParams.get('batchTitle');
      let target = '__ALL__';
      if (urlBatch && batches.some((b: any) => b.batchTitle === urlBatch)) {
        target = urlBatch;
      } else if (batches.length > 0) {
        // 默认选中最新录入的一场考试
        target = batches[0].batchTitle;
      }
      setCurrentBatch(target);
      loadBatchData(target);
    }).catch(() => {
      loadBatchData('__ALL__');
    });

    // 全屏事件监听：全屏时自动收起控制栏
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (isFull) {
        setControlsHidden(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 键盘监听：Esc退出全屏或返回，H键切换控制栏显隐
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          navigate('/screen');
        }
      } else if (e.key === 'h' || e.key === 'H') {
        setControlsHidden(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 平滑双缓冲垂直滚动循环
  useEffect(() => {
    const loop = () => {
      if (!isPaused && scrollContent1Ref.current && scrollContent2Ref.current) {
        scrollPosYRef.current -= scrollSpeed;
        const h = scrollContent1Ref.current.offsetHeight || 800;
        if (scrollPosYRef.current <= -h) {
          scrollPosYRef.current = 0;
        }
        scrollContent1Ref.current.style.transform = `translate3d(0, ${scrollPosYRef.current}px, 0)`;
        scrollContent2Ref.current.style.transform = `translate3d(0, ${scrollPosYRef.current + h}px, 0)`;
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPaused, scrollSpeed, displayList]);

  return (
    <div
      className="celebration-fullscreen-page"
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* 悬浮控制工具条 */}
      <div className={`celebration-controls ${controlsHidden ? 'is-hidden' : ''}`}>
        <div className="control-item exam-switch-item">
          <span className="ctrl-label" style={{ color: '#ffd700', fontWeight: 'bold' }}>
            <TrophyOutlined style={{ marginRight: 4 }} />
            切换考试
          </span>
          <Select
            value={currentBatch}
            onChange={handleBatchChange}
            size="small"
            style={{ width: 230 }}
            popupMatchSelectWidth={false}
            options={batchOptions}
          />
        </div>
        <div className="control-item">
          <span className="ctrl-label">自动轮播</span>
          <Switch
            checked={autoRotate}
            onChange={(val) => {
              setAutoRotate(val);
              if (val) {
                message.info(`已开启考试大屏自动轮巡播放（每 ${rotateInterval} 秒切换）`);
              } else {
                message.info('已关闭自动轮播');
              }
            }}
            checkedChildren="开"
            unCheckedChildren="关"
            size="small"
          />
        </div>
        <div className="control-item">
          <span className="ctrl-label">显示提分值</span>
          <Switch
            checked={showUpgrade}
            onChange={(val) => setShowUpgrade(val)}
            checkedChildren="开"
            unCheckedChildren="关"
            size="small"
          />
        </div>
        <div className="control-item">
          <span className="ctrl-label">姓名脱敏</span>
          <Switch
            checked={useMaskedName}
            onChange={(val) => setUseMaskedName(val)}
            checkedChildren="开"
            unCheckedChildren="关"
            size="small"
          />
        </div>
        <div className="control-item">
          <span className="ctrl-label">滚动速度</span>
          <Select
            value={scrollSpeed}
            onChange={(v) => setScrollSpeed(v)}
            size="small"
            style={{ width: 100 }}
            options={[
              { label: '0.5x 慢速', value: 0.3 },
              { label: '1.0x 正常', value: 0.6 },
              { label: '1.8x 快速', value: 1.1 }
            ]}
          />
        </div>
        <div className="control-item">
          <button className="ctrl-btn" onClick={toggleFullscreen} title="切换全屏模式">
            {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            <span>{isFullscreen ? '退出全屏' : '进入全屏'}</span>
          </button>
        </div>
        <div className="control-item">
          <button className="ctrl-btn btn-back" onClick={() => navigate('/screen')} title="返回数据大屏">
            <RollbackOutlined />
            <span>返回大屏</span>
          </button>
        </div>
        <div className="control-item">
          <button className="ctrl-btn btn-system" onClick={() => navigate('/')} title="进入管理后台">
            <DashboardOutlined />
            <span>进入后台</span>
          </button>
        </div>
        <div className="control-item">
          <button
            className="ctrl-btn btn-collapse"
            onClick={() => setControlsHidden(true)}
            title="收起控制面板（按键盘 H 键可随时重新唤出）"
          >
            <EyeInvisibleOutlined />
            <span>收起面板</span>
          </button>
        </div>
      </div>

      {/* 右上角控制面板按钮：通过点击此按钮控制展开/收起 */}
      <button
        className={`celebration-trigger-btn ${controlsHidden ? 'is-visible' : ''}`}
        onClick={() => setControlsHidden(false)}
        title="点击展开控制面板与切换考试 (快捷键: H)"
      >
        <SettingOutlined />
        <span>切换考试 / 控制台</span>
      </button>

      {/* 光荣榜主体区 */}
      <div className="celebration-body">
        {/* 左侧：竖排震撼标题 */}
        <div className="vertical-title-area">
          <div className="vertical-col">
            <div className="vertical-text title-school">{schoolTitle}</div>
          </div>
          <div className="vertical-col">
            <div className="vertical-text title-type">
              {renderVerticalBatchTitle(batchTitle)}
            </div>
          </div>
        </div>

        {/* 右侧：光荣榜播报栏 + 双缓冲无缝滚动表格 */}
        <div className="right-content-area">
          {/* 考试快捷切换胶囊选项卡 (触控屏与现场演示快速切换) */}
          <div className="exam-quick-tabs">
            <div className="tabs-header">
              <span className="tabs-title">
                <TrophyOutlined style={{ color: '#ffd700', marginRight: 6 }} />
                考试切换：
              </span>
              <div className="tabs-pill-list">
                <button
                  className={`exam-pill-btn ${currentBatch === '__ALL__' ? 'is-active' : ''}`}
                  onClick={() => handleBatchChange('__ALL__')}
                >
                  🌟 全校总榜
                </button>
                {batchOptions
                  .filter((b) => b.value !== '__ALL__')
                  .map((b) => (
                    <button
                      key={b.value}
                      className={`exam-pill-btn ${currentBatch === b.value ? 'is-active' : ''}`}
                      onClick={() => handleBatchChange(b.value)}
                    >
                      🏆 {b.value}
                      {b.totalCount != null && (
                        <span className="pill-badge">{b.totalCount}人</span>
                      )}
                    </button>
                  ))}
              </div>
              <div className="tabs-auto-toggle">
                <span className="auto-text">自动轮巡</span>
                <Switch
                  checked={autoRotate}
                  onChange={(val) => {
                    setAutoRotate(val);
                    if (val) message.info(`已开启考试大屏自动轮巡播放`);
                  }}
                  size="small"
                />
              </div>
            </div>
          </div>

          {/* 顶部高分动态摘要 */}
          <div className="stats-announcement-box">
            <div className="stats-text">
              <p>
                🌟 <strong>高分段断层领先，拔尖苗子批量涌现！</strong>
                在{batchTitle}中，汉外华襄高复学子表现卓越：全校最高提分达{' '}
                <span className="stat-highlight">{summary.maxUpgrade || 194.0}</span> 分，
                平均提分达 <span className="stat-highlight">{summary.avgUpgrade || 78.5}</span> 分，
                600分以上累计 <span className="stat-highlight">{summary.countAbove600 || 49}</span> 人，
                提分超100分学子共 <span className="stat-highlight">{summary.countUpgradeOver100 || 16}</span> 人！
              </p>
            </div>
          </div>

          {/* 双缓冲无缝垂直平滑滚动容器 或 空数据提示 */}
          {displayList.length === 0 ? (
            <div className="celebration-empty-box">
              <TrophyOutlined className="empty-trophy" />
              <div className="empty-title">当前考试【{batchTitle}】暂无登榜学子数据</div>
              <div className="empty-desc">您可以点击右上角控制面板切换其他考试，或在后台管理录入/导入成绩</div>
              <button className="ctrl-btn btn-system" style={{ margin: '16px auto 0' }} onClick={() => navigate('/edu/celebration')}>
                进入管理后台录入成绩
              </button>
            </div>
          ) : (
            <div
              className="infinite-scroll-container"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div ref={scrollContent1Ref} className="scroll-layer">
                <table className="celebration-table">
                  <tbody>
                    {displayList.map((item, idx) => (
                      <tr key={`c1_${idx}`}>
                        <td className="col-name">
                          {useMaskedName ? (item.maskedName || mask(item.studentName)) : item.studentName}
                        </td>
                      <td className="col-subject">{item.subject || '物化生'}</td>
                      <td className="col-before">
                        原始分数：<strong>{item.beforeScore != null ? item.beforeScore : '应届'}</strong>
                        {item.beforeScore != null ? '分' : ''}
                      </td>
                      <td className="col-after">
                        提升后成绩：<strong>{item.afterScore}</strong>分
                      </td>
                      {showUpgrade && (
                        <td className="col-upgrade">
                          <span className="upgrade-badge">
                            <span className="badge-flame">🔥</span>
                            <span className="badge-label">提升值：</span>
                            <span className="badge-value">+{item.upgradeScore}分</span>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div ref={scrollContent2Ref} className="scroll-layer">
              <table className="celebration-table">
                <tbody>
                  {displayList.map((item, idx) => (
                    <tr key={`c2_${idx}`}>
                      <td className="col-name">
                        {useMaskedName ? (item.maskedName || mask(item.studentName)) : item.studentName}
                      </td>
                      <td className="col-subject">{item.subject || '物化生'}</td>
                      <td className="col-before">
                        原始分数：<strong>{item.beforeScore != null ? item.beforeScore : '应届'}</strong>
                        {item.beforeScore != null ? '分' : ''}
                      </td>
                      <td className="col-after">
                        提升后成绩：<strong>{item.afterScore}</strong>分
                      </td>
                      {showUpgrade && (
                        <td className="col-upgrade">
                          <span className="upgrade-badge">
                            <span className="badge-flame">🔥</span>
                            <span className="badge-label">提升值：</span>
                            <span className="badge-value">+{item.upgradeScore}分</span>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default CelebrationScreen;
