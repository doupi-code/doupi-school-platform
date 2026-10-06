import { Link } from "react-router-dom";
import { Hero, SubNav, sectionTabs, pad } from "@/components/common/LayoutWidgets";
import { Ph, heroImg } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import { pageContent } from "@/cms/fallback";
import type { NavigationNode } from "@/cms/types";
import campusEnvironment from "@/assets/campus-environment.jpg";

export function AboutOverview({ section }: { section: NavigationNode }) {
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
        <div className="ov-poster">
          <img src={campusEnvironment} alt="校园" />
          <div>
            <p className="kicker">SINCE 2016</p>
            <h2>
              只做高三复读，
              <br />
              只做好这一年。
            </h2>
          </div>
        </div>
        <div className="results-grid ov-stats">
          {(pageContent.about.stats ?? []).map((s) => (
            <div key={s.label}>
              <b>{s.n}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="child-cards">
          {section.children?.map((c, i) => (
            <Link to={`/${section.slug}/${c.slug}`} key={c.slug}>
              <Ph tone={(i % 3) + 1} />
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
