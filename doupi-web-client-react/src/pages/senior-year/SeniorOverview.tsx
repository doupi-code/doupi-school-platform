import { Link } from "react-router-dom";
import { Hero, SubNav, Head, sectionTabs, pad } from "@/components/common/LayoutWidgets";
import { heroImg } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import type { NavigationNode } from "@/cms/types";

export function SeniorOverview({ section }: { section: NavigationNode }) {
  const marks = [
    { slug: "planning", at: 2, m: "9 月" },
    { slug: "curriculum", at: 30, m: "9 — 2 月" },
    { slug: "teaching", at: 58, m: "每天" },
    { slug: "featured-courses", at: 84, m: "全年" },
  ];

  return (
    <>
      <Hero
        img={heroImg[section.slug]}
        className="overview-hero"
        kicker={`${section.en} / OVERVIEW`}
        title={section.title}
        desc={section.desc}
        crumbs={[{ t: section.title }]}
      />
      <SubNav items={sectionTabs(section)} active="" />
      <section className="ov-wrap">
        <Head
          index="ONE YEAR MAP"
          title="一年地图"
          lead="从 9 月入学诊断到次年 7 月志愿填报，点击节点查看每一部分如何运作。"
        />
        <div className="year-map">
          <div className="ym-bar">
            {["9", "10", "11", "12", "1", "2", "3", "4", "5", "6"].map((m) => (
              <span key={m}>{m} 月</span>
            ))}
          </div>
          <div className="ym-phases">
            {[
              { t: "夯实基础", w: 60 },
              { t: "专题突破", w: 20 },
              { t: "冲刺提升", w: 20 },
            ].map((p) => (
              <i key={p.t} style={{ width: `${p.w}%` }}>
                {p.t}
              </i>
            ))}
          </div>
          <div className="ym-nodes">
            {marks.map((mk) => {
              const c = section.children?.find((x) => x.slug === mk.slug);
              return (
                c && (
                  <Link key={mk.slug} to={`/senior-year/${mk.slug}`} style={{ left: `${mk.at}%` }}>
                    <small>{mk.m}</small>
                    <b>{c.title}</b>
                    <span>{c.desc}</span>
                  </Link>
                )
              );
            })}
          </div>
        </div>
        <div className="child-cards">
          {section.children?.map((c, i) => (
            <Link to={`/${section.slug}/${c.slug}`} key={c.slug}>
              <em>{pad(i + 1)}</em>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <Arrow />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
