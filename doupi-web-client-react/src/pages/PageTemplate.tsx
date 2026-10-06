import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Hero, SubNav, Head, NextStep, sectionTabs, pad } from "@/components/common/LayoutWidgets";
import { Ph, heroImg } from "@/components/common/Ph";
import { pageContent } from "@/cms/fallback";
import type { NavigationNode, NavigationChild } from "@/cms/types";

export function PageTemplate({
  section,
  child,
  body,
  third,
}: {
  section: NavigationNode;
  child?: NavigationChild;
  body?: ReactNode;
  third?: string;
}) {
  const title = third || child?.title || section.title;
  const desc = third ? child?.title : child?.desc || section.desc;
  const content = pageContent[`${section.slug}/${child?.slug}`] ?? pageContent[section.slug];
  const crumbs = [
    { t: section.title, to: `/${section.slug}` },
    ...(child ? [{ t: child.title, to: third ? `/${section.slug}/${child.slug}` : undefined }] : []),
    ...(third ? [{ t: third }] : []),
  ];

  return (
    <>
      <Hero
        kicker={`${section.en} / ${third ? "PROFILE" : child ? "DETAIL" : "OVERVIEW"}`}
        title={title}
        desc={desc}
        crumbs={crumbs}
        img={heroImg[section.slug]}
      />
      <SubNav items={sectionTabs(section)} active={child?.slug ?? ""} />
      <div className="page-body wide">
        <aside hidden className="side-nav">
          <span className="side-label">NAVIGATION</span>
          <Link to={`/${section.slug}`} className={!child ? "chosen parent" : "parent"}>
            <b>{section.title}</b>
            <small>{section.en}</small>
          </Link>
          <div className="side-children">
            {section.children?.map((x, index) => (
              <Link className={x.slug === child?.slug ? "chosen" : ""} to={`/${section.slug}/${x.slug}`} key={x.slug}>
                <em>0{index + 1}</em>
                {x.title}
              </Link>
            ))}
          </div>
        </aside>
        <article>
          {body ?? (
            <>
              <Head index="01 — HUAXIANG" title={title} lead={content?.lead ?? desc} />
              <Ph className="content-ph" tone={2} label={title} />
              {content && (
                <div className="feature-rows">
                  {content.blocks.map((b, i) => (
                    <div className="feature-row" key={b.h}>
                      <em>{pad(i + 1)}</em>
                      <div>
                        <h3>{b.h}</h3>
                        <p>{b.p}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {child && <NextStep section={section} child={child} />}
        </article>
      </div>
    </>
  );
}
