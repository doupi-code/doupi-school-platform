import { Link } from "react-router-dom";
import { Hero, SubNav, sectionTabs, pad } from "@/components/common/LayoutWidgets";
import { heroImg } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import { useBooking } from "@/components/booking";
import { useClassPlans, useSiteConfig } from "@/cms/hooks";
import type { NavigationNode } from "@/cms/types";

export function AdmissionsOverview({ section }: { section: NavigationNode }) {
  const b = useBooking();
  const classPlans = useClassPlans();
  const { config } = useSiteConfig();
  const left = classPlans.reduce((n, c) => n + c.seats - c.taken, 0);
  const phone = config.hotlines?.[0] || "027-81777887";

  return (
    <>
      {b.modal}
      <Hero
        img={heroImg[section.slug]}
        className="overview-hero"
        kicker={`${section.en} / OVERVIEW`}
        title={section.title}
        desc={section.desc}
        crumbs={[{ t: section.title }]}
        aside={
          <div className="adm-status">
            <i className="live-dot" />
            2026 秋季班招生进行中 · 剩余学位 {left}
          </div>
        }
      />
      <SubNav items={sectionTabs(section)} active="" />
      <section className="ov-wrap">
        <div className="adm-flow">
          {[
            { t: "了解", d: "浏览招生简章与常见问题", to: "/admissions/guide" },
            { t: "预约", d: "预约游园或一对一咨询", to: "/admissions/consultation" },
            { t: "报名", d: "入学诊断后确定班型并报名", to: "/admissions/guide" },
          ].map((s, i) => (
            <Link to={s.to} key={s.t}>
              <em>STEP {pad(i + 1)}</em>
              <b>{s.t}</b>
              <span>{s.d}</span>
            </Link>
          ))}
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

        <div className="adm-cta">
          <div className="adm-cta-text">
            <p>VISIT HUAXIANG</p>
            <h2>
              最好的了解方式，
              <br />
              是来一趟。
            </h2>
          </div>
          <div className="adm-cta-act">
            <button type="button" onClick={b.open}>
              预约游园 / 诊断 <Arrow />
            </button>
            <a href={`tel:${phone}`}>
              <small>咨询热线</small>
              {phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
