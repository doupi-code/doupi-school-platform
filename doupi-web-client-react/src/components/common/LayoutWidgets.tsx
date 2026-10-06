import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Arrow } from "./Icons";
import { IMG } from "./Ph";
import { useBooking } from "@/components/booking";
import type { NavigationNode, NavigationChild } from "@/cms/types";

export const pad = (n: number) => String(n).padStart(2, "0");
const PHONE = "027-81777887";

export function Crumbs({ items }: { items: { t: string; to?: string }[] }) {
  return (
    <div className="crumb crumbs">
      <Link to="/">首页</Link>
      {items.map((i) => (
        <span key={i.t}>
          <span> / </span>
          {i.to ? <Link to={i.to}>{i.t}</Link> : <b>{i.t}</b>}
        </span>
      ))}
    </div>
  );
}

export function Hero({
  kicker,
  title,
  desc,
  crumbs,
  aside,
  className = "",
  img,
}: {
  kicker: string;
  title: ReactNode;
  desc?: string;
  crumbs: { t: string; to?: string }[];
  aside?: ReactNode;
  className?: string;
  img?: string;
}) {
  const en = kicker.split(" / ")[0];
  return (
    <section className={`p-hero ${className}`}>
      <img className="p-hero-bg" src={img ?? IMG.brick} alt="" />
      <div className="p-hero-inner">
        <Crumbs items={crumbs} />
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {desc && <p className="p-hero-desc">{desc}</p>}
        {aside}
      </div>
      <span className="p-hero-word" aria-hidden="true">
        {en}
      </span>
    </section>
  );
}

export function SubNav({
  items,
  active,
}: {
  items: { t: string; to: string; key: string }[];
  active?: string;
}) {
  return (
    <nav className="sub-nav">
      <div className="sub-nav-inner">
        {items.map((x, i) => (
          <Link key={x.key} to={x.to} className={x.key === active ? "on" : ""}>
            <em>{pad(i)}</em>
            {x.t}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export const sectionTabs = (section: NavigationNode) => [
  { t: "栏目总览", to: `/${section.slug}`, key: "" },
  ...(section.children ?? []).map((c) => ({ t: c.title, to: `/${section.slug}/${c.slug}`, key: c.slug })),
];

export function Head({ index, title, lead }: { index: string; title: string; lead?: string }) {
  return (
    <>
      <p className="article-index">{index}</p>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </>
  );
}

export function NextStep({ section, child }: { section: NavigationNode; child?: NavigationChild }) {
  const b = useBooking();
  const list = section.children ?? [];
  const i = child ? list.findIndex((c) => c.slug === child.slug) : -1;
  const prev = i > 0 ? list[i - 1] : undefined;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : undefined;

  return (
    <div className="next-step">
      {b.modal}
      <div className="ns-links">
        {prev ? (
          <Link to={`/${section.slug}/${prev.slug}`}>
            <small>上一篇</small>
            {prev.title}
          </Link>
        ) : (
          <Link to={`/${section.slug}`}>
            <small>返回</small>
            {section.title}
          </Link>
        )}
        {next && (
          <Link className="ns-next" to={`/${section.slug}/${next.slug}`}>
            <small>下一篇</small>
            {next.title}
          </Link>
        )}
      </div>
      <div className="ns-cta">
        <div>
          <b>来校园走一走</b>
          <span>咨询热线 {PHONE}</span>
        </div>
        <button type="button" className="primary-btn" onClick={b.open}>
          预约游园 <Arrow />
        </button>
      </div>
    </div>
  );
}
