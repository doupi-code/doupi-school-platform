import { Link } from "react-router-dom";
import { Hero, SubNav, sectionTabs, pad } from "@/components/common/LayoutWidgets";
import { Ph, heroImg } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import type { NavigationNode } from "@/cms/types";
import baseballActivity from "@/assets/baseball-activity.gif";
import campusEnvironment from "@/assets/campus-environment.jpg";

export function LifeOverview({ section }: { section: NavigationNode }) {
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
        <div className="collage">
          <img className="c1" src={baseballActivity} alt="棒球活动" />
          <Ph className="c2" label="晨读" tone={2} />
          <Ph className="c3" label="食堂" tone={3} />
          <img className="c4" src={campusEnvironment} alt="校园" />
          <Ph className="c5" label="成人礼" tone={1} />
          <Ph className="c6" label="晚自习" tone={2} />
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
