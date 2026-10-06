import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button, Tag } from "antd";
import { TrophyOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Arrow, pad } from "@/components/common";
import { Ph } from "@/components/common/Ph";
import { FacultySpotlight } from "@/components/common/FacultySpotlight";
import { useBooking } from "@/components/booking";
import { useSiteConfig, useArticles, useFacilities, usePageRender } from "@/cms/hooks";
import { ComponentResolver } from "@/components/cms/ComponentResolver";
import { reasons, successStories } from "@/cms/fallback";
import campusEnvironment from "@/assets/campus-environment.jpg";
import baseballActivity from "@/assets/baseball-activity.gif";

export default function Home() {
  const { sections } = usePageRender("/");
  const b = useBooking();
  const { config } = useSiteConfig();
  const { articles: updates } = useArticles("updates");
  const { articles: notices } = useArticles("notices");
  const { facilities } = useFacilities();
  const [story, setStory] = useState<number | null>(null);

  // 如果 CMS 配置了全站动态区块或收到实时草稿广播，优先由 ComponentResolver 渲染
  if (sections && sections.length > 0) {
    return <ComponentResolver sections={sections} />;
  }

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

      {/* 首页巨幕 Hero */}
      <section className="home-hero">
        <div className="hero-image" />
        <div className="hero-content">
          <p className="kicker">{config.kicker || "ONE YEAR. A NEW POSSIBILITY."}</p>
          <h1>{renderSlogan(config.slogan)}</h1>
          <p>{config.subtitle || "只专注高三。让每一份不甘，都拥有重新抵达的路径。"}</p>
          <div className="hero-actions">
            <button type="button" className="primary-btn" onClick={b.open}>
              预约游园 / 诊断 <Arrow />
            </button>
          </div>
        </div>
        <div className="hero-note">
          <b>2026</b>
          <span>
            <i className="live-dot" />
            秋季班招生进行中 · 余位 115
            <br />
            红砖校园 · 专注高三
          </span>
        </div>
      </section>

      {/* 核心办学成效看板 */}
      <section className="results-band">
        <p className="kicker">2026 RESULTS</p>
        <div className="results-grid">
          {(config.statResults || []).map((r) => (
            <div key={r.label}>
              <b>{r.n}</b>
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 办学理念引言 */}
      <section className="intro-section">
        <div>
          <p className="kicker">A FOCUSED YEAR</p>
          <h2>
            用更精准的
            <br />
            一年，再攀一程
          </h2>
        </div>
        <p>
          汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。
        </p>
      </section>

      {/* 为什么选择华襄四大理由 */}
      <section className="reasons">
        <div className="reasons-grid">
          {reasons.map((r, i) => (
            <Link to={r.to} key={r.t}>
              <em>{pad(i + 1)}</em>
              <h3>{r.t}</h3>
              <p>{r.d}</p>
              <Arrow />
            </Link>
          ))}
        </div>
      </section>

      {/* 名校逆袭与提分案例 */}
      <section className="stories">
        <div className="section-row">
          <div>
            <p className="kicker">STUDENT STORIES</p>
            <h2>他们，重新抵达</h2>
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

      {/* 现代提分逆袭学术详情弹窗 */}
      <Modal
        open={s !== null}
        onCancel={() => setStory(null)}
        footer={null}
        centered
        width={560}
        styles={{
          body: {
            borderRadius: 12,
            padding: 8,
          },
        }}
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

            {/* 提分可视化展示区 */}
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

      {/* 师资天团聚光灯 */}
      <FacultySpotlight />

      {/* 校园实景画廊 */}
      <section className="campus-scroll">
        <div className="section-row">
          <div>
            <p className="kicker">OUR CAMPUS</p>
            <h2>在足够好的环境里，安心向上</h2>
          </div>
          <Link className="line-link" to="/about/campuses">
            走进校园 <Arrow />
          </Link>
        </div>

        {/* 动态校园硬件与环境指标 (来源于 CMS 门户参数) */}
        {config.statCampus && config.statCampus.length > 0 && (
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
            {config.statCampus.map((item, idx) => (
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

      {/* 校园资讯与红头公文双栏流 */}
      <section className="news-duo">
        <div className="section-row">
          <div>
            <p className="kicker">FROM HUAXIANG</p>
            <h2>此刻，正在发生</h2>
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
                <small>
                  {a.date} · {a.category}
                </small>
                <h3>{a.title}</h3>
              </Link>
            ))}
          </div>
          <div className="duo-notices">
            <span className="side-label">校园公告</span>
            {notices.slice(0, 5).map((a) => (
              <Link to={`/news/notices/${a.id}`} key={a.id}>
                <time>{a.date.slice(5)}</time>
                <span>{a.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
