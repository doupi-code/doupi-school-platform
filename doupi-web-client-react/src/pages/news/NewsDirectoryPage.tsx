import { useState } from "react";
import { Link } from "react-router-dom";
import { Segmented, Tag, Timeline, Table, Card } from "antd";
import {
  CalendarOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { Hero, SubNav, sectionTabs } from "@/components/common/LayoutWidgets";
import { heroImg, Ph } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import { useArticles } from "@/cms/hooks";
import { defaultNavigation, gaokaoSchedule, scoreLines } from "@/cms/fallback";
import type { ArticleKind } from "@/cms/types";
import baseballActivity from "@/assets/baseball-activity.gif";
import campusEnvironment from "@/assets/campus-environment.jpg";

const kindTitle: Record<ArticleKind, string> = {
  updates: "校园动态",
  notices: "校园公告",
  gaokao: "高考资讯",
};

export function NewsDirectory({ kind }: { kind: ArticleKind }) {
  const { articles: items } = useArticles(kind);
  const [cat, setCat] = useState("全部");
  const desc =
    kind === "notices"
      ? "重要安排、招生信息与校务红头公文，确保每一位家长和学生及时获知权威指引。"
      : kind === "gaokao"
      ? "新高考政策解读、历年各批次控制线、赋分测算与志愿填报科学规划。"
      : "记录红砖校园里的求学日常、师生拔尖成长与每一个值得被珍视的高三时刻。";
  const days = Math.max(
    0,
    Math.ceil((new Date(2027, 5, 7).getTime() - Date.now()) / 864e5)
  );

  const newsNav =
    defaultNavigation.find((n) => n.slug === "news") || defaultNavigation[0];

  const scoreColumns = [
    {
      title: "年份",
      dataIndex: "y",
      key: "y",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: "物理类 (本科/特控)",
      dataIndex: "p",
      key: "p",
      render: (text: string) => (
        <span style={{ color: "#8B1D2C", fontWeight: 600 }}>{text}</span>
      ),
    },
    {
      title: "历史类 (本科/特控)",
      dataIndex: "h",
      key: "h",
      render: (text: string) => (
        <span style={{ color: "#1e3a8a", fontWeight: 600 }}>{text}</span>
      ),
    },
  ];

  return (
    <>
      <Hero
        img={heroImg.news}
        className="news-hero"
        kicker={`NEWS & STORIES / ${kind.toUpperCase()}`}
        title={kindTitle[kind]}
        desc={desc}
        crumbs={[{ t: "校园资讯", to: "/news" }, { t: kindTitle[kind] }]}
      />
      <SubNav items={sectionTabs(newsNav)} active={kind} />
      <section className="news-directory">
        {/* 1. 校园动态 */}
        {kind === "updates" && (
          <>
            {(() => {
              const filtered = items.filter(
                (a) => cat === "全部" || a.category === cat
              );
              const [first, ...rest] = filtered;
              const cats = [
                "全部",
                ...Array.from(new Set(items.map((a) => a.category))),
              ];
              return (
                <>
                  <div style={{ margin: "20px 0 24px" }}>
                    <Segmented
                      options={cats}
                      value={cat}
                      onChange={(v) => setCat(String(v))}
                      size="middle"
                      style={{
                        background: "#f3f4f6",
                        padding: 4,
                        borderRadius: 8,
                      }}
                    />
                  </div>
                  {first && (
                    <Link
                      to={`/news/updates/${first.id}`}
                      className="headline"
                      style={{ borderRadius: 8, overflow: "hidden" }}
                    >
                      <img
                        src={
                          first.coverUrl ||
                          (first.id === "baseball"
                            ? baseballActivity
                            : campusEnvironment)
                        }
                        alt=""
                      />
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                          <Tag color="#8B1D2C" style={{ margin: 0, borderRadius: 4 }}>
                            {first.category}
                          </Tag>
                          <small style={{ color: "#64748b", fontWeight: 500 }}>{first.date}</small>
                        </div>
                        <h2>{first.title}</h2>
                        <p>{first.excerpt || first.summary}</p>
                      </div>
                    </Link>
                  )}
                  <div className="duo-cards three">
                    {rest.map((a, i) => (
                      <Link
                        to={`/news/updates/${a.id}`}
                        key={a.id}
                        className="duo-card"
                        style={{ borderRadius: 8, overflow: "hidden" }}
                      >
                        <Ph tone={(i % 3) + 1} src={a.coverUrl} />
                        <div style={{ display: "flex", gap: 6, margin: "8px 0 4px" }}>
                          <Tag style={{ margin: 0, fontSize: 11 }}>{a.category}</Tag>
                          <small style={{ color: "#64748b", fontWeight: 500 }}>{a.date}</small>
                        </div>
                        <h3>{a.title}</h3>
                        <p>{a.excerpt || a.summary}</p>
                      </Link>
                    ))}
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* 2. 校园公告（公文红头排版） */}
        {kind === "notices" && (
          <div className="notice-list" style={{ marginTop: 24 }}>
            {items.map((a) => (
              <Link
                to={`/news/notices/${a.id}`}
                key={a.id}
                style={{
                  borderRadius: 8,
                  padding: "16px 20px",
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className="date-block" style={{ borderRadius: 6 }}>
                    <b>{a.date.slice(8)}</b>
                    <small>{a.date.slice(0, 7)}</small>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {a.pinned && (
                        <Tag color="#8B1D2C" style={{ margin: 0, borderRadius: 4, fontWeight: 600 }}>
                          置顶
                        </Tag>
                      )}
                      <Tag color="default" style={{ margin: 0, borderRadius: 4 }}>
                        {a.category}
                      </Tag>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#1f2937" }}>{a.title}</h3>
                  </div>
                </div>
                <Arrow />
              </Link>
            ))}
          </div>
        )}

        {/* 3. 高考资讯（倒计时卡片 + 备考时间线 + 历年分数线 Table） */}
        {kind === "gaokao" && (
          <div className="gaokao-layout" style={{ marginTop: 24 }}>
            <div>
              {/* 高考倒计时大卡片 */}
              <div
                style={{
                  background: "linear-gradient(135deg, #8B1D2C 0%, #580c16 100%)",
                  borderRadius: 10,
                  padding: "24px 28px",
                  color: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  boxShadow: "0 10px 25px rgba(139, 29, 44, 0.2)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, opacity: 0.85, letterSpacing: "0.1em" }}>
                    <FireOutlined style={{ color: "#facc15", marginRight: 6 }} />
                    2027 湖北新高考冲刺倒计时
                  </div>
                  <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>
                    专注高三，笃行致远，让每一份不甘都重抵目标
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 800,
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {days}
                  </span>
                  <span style={{ fontSize: 14, marginLeft: 4, opacity: 0.85 }}>天</span>
                </div>
              </div>

              {/* 现代 Ant Design 备考时间线 */}
              <Card
                title={
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }}>
                    <CalendarOutlined style={{ color: "#8B1D2C", marginRight: 8 }} />
                    高三备考关键里程碑与政策日程
                  </span>
                }
                style={{ borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 24 }}
              >
                <Timeline
                  style={{ marginTop: 12 }}
                  items={gaokaoSchedule.map((g) => ({
                    color: "#8B1D2C",
                    children: (
                      <div>
                        <strong style={{ color: "#1f2937", display: "inline-block", marginRight: 10 }}>
                          {g.t}
                        </strong>
                        <span style={{ color: "#6b7280", fontSize: 13 }}>{g.d}</span>
                      </div>
                    ),
                  }))}
                />
              </Card>

              {/* 高考资讯文章流 */}
              <div className="news-list">
                {items.map((a) => (
                  <Link
                    className="story-row"
                    to={`/news/gaokao/${a.id}`}
                    key={a.id}
                    style={{ borderRadius: 8, padding: "14px 16px" }}
                  >
                    <time style={{ fontFamily: "monospace", color: "#8B1D2C" }}>{a.date}</time>
                    <div>
                      <Tag style={{ margin: "0 0 4px" }}>{a.category}</Tag>
                      <h2 style={{ fontSize: 16 }}>{a.title}</h2>
                      <span>{a.excerpt || a.summary}</span>
                    </div>
                    <Arrow />
                  </Link>
                ))}
              </div>
            </div>

            {/* 历年控制线表格 */}
            <aside>
              <Card
                title={
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }}>
                      湖北省历年高考控制线
                    </div>
                    <small style={{ color: "#9ca3af", fontWeight: "normal" }}>
                      本科批次 / 特殊类型招生线
                    </small>
                  </div>
                }
                style={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              >
                <Table
                  dataSource={scoreLines.map((s) => ({ ...s, key: s.y }))}
                  columns={scoreColumns}
                  pagination={false}
                  size="small"
                  bordered
                />
              </Card>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
