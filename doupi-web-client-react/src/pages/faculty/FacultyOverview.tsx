import { Link } from "react-router-dom";
import { Hero, SubNav, sectionTabs, pad } from "@/components/common/LayoutWidgets";
import { heroImg } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import { Portrait } from "@/components/common/Portrait";
import { ManagementPreview } from "@/components/common/FacultySpotlight";
import { useTeachers } from "@/cms/hooks";
import type { NavigationNode } from "@/cms/types";

export function FacultyOverview({ section }: { section: NavigationNode }) {
  const { teachers } = useTeachers();
  const head = teachers.find((t) => t.role === "校长") ?? teachers[0];

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
        {head && (
          <div className="principal-note">
            <Portrait teacher={head} />
            <div>
              <p className="kicker">FROM THE PRINCIPAL</p>
              <blockquote>“复读的一年，我们不承诺奇迹，只承诺每一天都被认真对待。”</blockquote>
              <b>
                {head.name} · {head.role}
              </b>
              <span>{(Array.isArray(head.tags) ? head.tags : []).join(" · ")}</span>
            </div>
          </div>
        )}
        <div className="results-grid ov-stats">
          <div>
            <b>{teachers.filter((t) => (Array.isArray(t.tags) ? t.tags : []).some((x) => x.includes("特级"))).length}</b>
            <span>特级教师</span>
          </div>
          <div>
            <b>{teachers.filter((t) => (Array.isArray(t.tags) ? t.tags : []).some((x) => x.includes("正高级"))).length}</b>
            <span>正高级教师</span>
          </div>
          <div>
            <b>26</b>
            <span>平均教龄（年）</span>
          </div>
          <div>
            <b>9</b>
            <span>学科首席</span>
          </div>
        </div>
        <div className="avatar-wall">
          {teachers.map((t) => (
            <Link key={t.id} to={`/faculty/teachers/${t.id}`} title={`${t.name} · ${t.subject}`}>
              <Portrait teacher={t} />
              <small>{t.name}</small>
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
        <ManagementPreview />
      </section>
    </>
  );
}
