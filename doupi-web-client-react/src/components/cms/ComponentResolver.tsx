import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button, Tag } from "antd";
import { TrophyOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Arrow, pad } from "@/components/common";
import { Ph } from "@/components/common/Ph";
import { FacultySpotlight } from "@/components/common/FacultySpotlight";
import { useBooking } from "@/components/booking";
import { useArticles, useFacilities } from "@/cms/hooks";
import { reasons as defaultReasons, successStories } from "@/cms/fallback";
import campusEnvironment from "@/assets/campus-environment.jpg";
import baseballActivity from "@/assets/baseball-activity.gif";

interface ComponentResolverProps {
  sections: any[];
}

export const ComponentResolver: React.FC<ComponentResolverProps> = ({ sections }) => {
  const b = useBooking();
  const { articles: updates } = useArticles("updates");
  const { facilities } = useFacilities();

  const [story, setStory] = useState<number | null>(null);
  const s = story !== null ? successStories[story] : null;

  const renderSlogan = (sloganText?: string) => {
    const text = sloganText?.trim() || "不是复读，是再出发";
    if (text.includes("\n")) {
      const parts = text.split("\n").filter(Boolean);
      return (
        <>
          {parts[0]}
          {parts.length > 1 && (
            <>
              <br />
              <i>{parts.slice(1).join(" ")}</i>
            </>
          )}
        </>
      );
    }
    if (text.includes("，") || text.includes(",")) {
      const delimiter = text.includes("，") ? "，" : ",";
      const parts = text.split(delimiter);
      return (
        <>
          {parts[0]}
          {parts.length > 1 && (
            <>
              <br />
              <i>{parts.slice(1).join(" ")}</i>
            </>
          )}
        </>
      );
    }
    return text;
  };

  return (
    <>
      {b.modal}

      {/* 提分逆袭故事详情弹窗 */}
      <Modal
        open={s !== null}
        onCancel={() => setStory(null)}
        footer={null}
        centered
        width={560}
        styles={{ body: { borderRadius: 12, padding: 8 } }}
      >
        {s && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Tag color="#8B1D2C" style={{ borderRadius: 4, fontWeight: 600, padding: "2px 8px" }}>
                <TrophyOutlined style={{ marginRight: 4 }} /> 真实提分案例
              </Tag>
              <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "var(--font-mono)" }}>
                STUDENT SUCCESS STORY
              </span>
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 22, fontFamily: "var(--font-serif)", color: "#111827" }}>
              {s.name} · <span style={{ color: "#8B1D2C" }}>录取至 {s.school}</span>
            </h3>
            <div
              style={{
                background: "#fdf2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                margin: "16px 0",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>复读前高考总分</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#9ca3af", textDecoration: "line-through" }}>
                  {s.from}
                </div>
              </div>
              <div style={{ color: "#8B1D2C", fontSize: 20 }}>➔</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>冲刺后高考总分</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#8B1D2C", fontFamily: "var(--font-serif)" }}>
                  {s.to}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>净增提分幅度</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>
                  <ArrowUpOutlined style={{ fontSize: 18 }} />+{s.to - s.from}
                </div>
              </div>
            </div>
            <div style={{ background: "#f9fafb", padding: "14px 16px", borderRadius: 6, marginBottom: 16 }}>
              <p style={{ margin: 0, fontStyle: "italic", color: "#4b5563", fontSize: 14, lineHeight: 1.7 }}>
                “{s.quote}”
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8, margin: "0 0 20px" }}>
              入学初期，{s.name}的弱项主要集中在数学解题逻辑与选考科目综合运用。经华襄教学研究院深度学情测评后，编入拔尖冲刺教学组，配合每周专属导师复盘与名师个性化错题答疑，最终实现高考总分突破{" "}
              <b style={{ color: "#8B1D2C" }}>{s.to - s.from} 分</b>，成功考入目标高校。
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button onClick={() => setStory(null)}>关闭</Button>
              <Button
                type="primary"
                style={{ background: "#8B1D2C", borderColor: "#8B1D2C" }}
                onClick={() => {
                  setStory(null);
                  b.open();
                }}
              >
                预约同款名师学情诊断
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 动态区块按序列智能渲染 */}
      {sections.map((section, index) => {
        if (section.isVisible === 0) return null;
        const c = section.content || {};

        switch (section.sectionType) {
          case "hero":
            return (
              <section className="home-hero" key={section.sectionId || index}>
                <div className="hero-image" />
                <div className="hero-content">
                  <p className="kicker">{c.kicker || "ONE YEAR. A NEW POSSIBILITY."}</p>
                  <h1>{renderSlogan(c.slogan)}</h1>
                  <p>{c.subtitle || "只专注高三。让每一份不甘，都拥有重新抵达的路径。"}</p>
                  <div className="hero-actions">
                    <button type="button" className="primary-btn" onClick={b.open}>
                      {c.ctaText || "预约游园 / 诊断"} <Arrow />
                    </button>
                  </div>
                </div>
                <div className="hero-note">
                  <b>{c.noteYear || "2026"}</b>
                  <span>
                    <i className="live-dot" />
                    {c.noteText || "秋季班招生进行中 · 余位 115\n红砖校园 · 专注高三"}
                  </span>
                </div>
              </section>
            );

          case "results":
            const resultItems = Array.isArray(c.items) && c.items.length > 0 ? c.items : [
              { n: "92.6%", label: "2026 届本科上线率" },
              { n: "+86", label: "平均提分（分）" },
              { n: "318", label: "600 分以上人数" },
              { n: "146", label: "双一流院校录取" }
            ];
            return (
              <section className="results-band" key={section.sectionId || index}>
                <p className="kicker">{c.kicker || "2026 RESULTS"}</p>
                <div className="results-grid">
                  {resultItems.map((r: any, idx: number) => (
                    <div key={idx}>
                      <b>{r.n}</b>
                      <span>{r.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            );

          case "intro":
            return (
              <section className="intro-section" key={section.sectionId || index}>
                <div>
                  <p className="kicker">{c.kicker || "A FOCUSED YEAR"}</p>
                  <h2>{c.title ? c.title.split("\n").map((line: string, i: number) => <React.Fragment key={i}>{line}<br/></React.Fragment>) : "用更精准的一年，再攀一程"}</h2>
                </div>
                <p>{c.desc || "汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。"}</p>
              </section>
            );

          case "reasons":
            const reasonList = Array.isArray(c.items) && c.items.length > 0 ? c.items : defaultReasons;
            return (
              <section className="reasons" key={section.sectionId || index}>
                <div className="reasons-grid">
                  {reasonList.map((r: any, i: number) => (
                    <Link to={r.to || "/"} key={i}>
                      <em>{pad(i + 1)}</em>
                      <h3>{r.t}</h3>
                      <p>{r.d}</p>
                      <Arrow />
                    </Link>
                  ))}
                </div>
              </section>
            );

          case "stories":
            return (
              <section className="stories" key={section.sectionId || index}>
                <div className="section-row">
                  <div>
                    <p className="kicker">{c.kicker || "STUDENT STORIES"}</p>
                    <h2>{c.title || "他们，重新抵达"}</h2>
                  </div>
                </div>
                <div className="story-grid">
                  {successStories.map((st, i) => (
                    <button type="button" className="story-card" key={st.name} onClick={() => setStory(i)}>
                      <div className="story-score">
                        <span>{st.from}</span>
                        <Arrow />
                        <b>{st.to}</b>
                      </div>
                      <p>“{st.quote}”</p>
                      <footer>
                        <Ph tone={(i % 3) + 1} className="avatar" />
                        <div>
                          <b>{st.name}</b>
                          <small>{st.school}</small>
                        </div>
                      </footer>
                    </button>
                  ))}
                </div>
              </section>
            );

          case "faculty":
            return <FacultySpotlight key={section.sectionId || index} />;

          case "campus":
            const campusStats = Array.isArray(c.statCampus) ? c.statCampus : [];
            return (
              <section className="campus-scroll" key={section.sectionId || index}>
                <div className="section-row">
                  <div>
                    <p className="kicker">{c.kicker || "OUR CAMPUS"}</p>
                    <h2>{c.title || "在足够好的环境里，安心向上"}</h2>
                  </div>
                  <Link className="line-link" to="/about/campuses">
                    走进校园 <Arrow />
                  </Link>
                </div>
                {campusStats.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`,
                      gap: 16,
                      margin: "0 0 28px",
                      padding: "20px 24px",
                      background: "rgba(139, 29, 44, 0.04)",
                      borderRadius: 12,
                      border: "1px solid rgba(139, 29, 44, 0.12)",
                    }}
                  >
                    {campusStats.map((item: any, idx: number) => (
                      <div key={idx} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#8B1D2C", fontFamily: "var(--font-serif)" }}>
                          {item.n}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="scroll-track">
                  <img src={campusEnvironment} alt="校园环境" loading="lazy" />
                  {facilities.slice(0, 6).map((f, i) => (
                    <Link to={`/about/campuses/${f.id}`} key={f.id}>
                      <Ph label={f.name} tone={(i % 3) + 1} src={f.imageUrl} />
                      <small>{f.tag}</small>
                    </Link>
                  ))}
                  <img src={baseballActivity} alt="校园棒球活动" loading="lazy" />
                </div>
              </section>
            );

          case "news":
            return (
              <section className="news-duo" key={section.sectionId || index}>
                <div className="section-row">
                  <div>
                    <p className="kicker">{c.kicker || "FROM HUAXIANG"}</p>
                    <h2>{c.title || "此刻，正在发生"}</h2>
                  </div>
                  <Link className="line-link" to="/news">
                    全部资讯 <Arrow />
                  </Link>
                </div>
                <div className="duo-grid">
                  <div className="duo-cards">
                    {updates.slice(0, 3).map((a, i) => (
                      <Link to={`/news/updates/${a.id}`} key={a.id} className="duo-card">
                        <Ph tone={(i % 3) + 1} src={a.coverUrl} />
                        <small>{a.category}</small>
                        <h3>{a.title}</h3>
                        <p>{a.summary}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "rich_text":
            return (
              <section
                key={section.sectionId || index}
                style={{
                  maxWidth: 1200,
                  margin: "40px auto",
                  padding: "0 24px",
                }}
              >
                {c.title && <h2 style={{ fontSize: 28, marginBottom: 16 }}>{c.title}</h2>}
                <div
                  style={{ lineHeight: 1.8, color: "#374151" }}
                  dangerouslySetInnerHTML={{ __html: c.html || c.content || "" }}
                />
              </section>
            );

          default:
            return null;
        }
      })}
    </>
  );
};
export default ComponentResolver;
