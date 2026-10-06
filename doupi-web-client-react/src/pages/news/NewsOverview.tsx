import { Link } from "react-router-dom";
import { Hero, SubNav, sectionTabs } from "@/components/common/LayoutWidgets";
import { heroImg } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import { useArticles } from "@/cms/hooks";
import type { NavigationNode, ArticleKind } from "@/cms/types";
import campusEnvironment from "@/assets/campus-environment.jpg";

const kindTitle: Record<ArticleKind, string> = {
  updates: "校园动态",
  notices: "校园公告",
  gaokao: "高考资讯",
};

export function NewsOverview({ section }: { section: NavigationNode }) {
  const { articles: allArticles } = useArticles();
  const top = allArticles.find((a) => a.kind === "updates") || allArticles[0];

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
        {top && (
          <Link to={`/news/updates/${top.id}`} className="headline">
            <img src={top.coverUrl || campusEnvironment} alt="" />
            <div>
              <small>{top.date} · 头条</small>
              <h2>{top.title}</h2>
              <p>{top.excerpt || top.summary}</p>
            </div>
          </Link>
        )}
        <div className="news-cols">
          {(["updates", "notices", "gaokao"] as ArticleKind[]).map((k) => (
            <div key={k}>
              <div className="nc-head">
                <b>{kindTitle[k]}</b>
                <Link to={`/news/${k}`}>
                  更多 <Arrow />
                </Link>
              </div>
              {allArticles
                .filter((a) => a.kind === k)
                .slice(0, 3)
                .map((a) => (
                  <Link to={`/news/${k}/${a.id}`} key={a.id}>
                    <time>{a.date}</time>
                    <span>{a.title}</span>
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
