import { useState } from "react";
import { Link } from "react-router-dom";
import { Head, pad } from "@/components/common/LayoutWidgets";
import { Ph } from "@/components/common/Ph";
import { Arrow } from "@/components/common/Icons";
import { Portrait } from "@/components/common/Portrait";
import { useBooking } from "@/components/booking";
import { useTracks, useTeachers } from "@/cms/hooks";
import { pageContent } from "@/cms/fallback";
import type { Track } from "@/cms/types";

export function FeaturedBody() {
  const [open, setOpen] = useState<string | null>("languages");
  const tracks = useTracks();

  return (
    <>
      <Head
        index="FEATURED TRACKS"
        title="特色课程"
        lead={pageContent["senior-year/featured-courses"].lead}
      />
      <div className="track-grid">
        {tracks.map((t, i) => (
          <div className={`track-card${i === 0 ? " big" : ""}${open === t.id ? " open" : ""}`} key={t.id}>
            <Ph tone={(i % 3) + 1} label={t.en} />
            <div className="track-body">
              <h3>{t.name}</h3>
              <p>{t.lead}</p>
              {open === t.id && (
                <div className="track-more">
                  <small>适合谁</small>
                  <ul>
                    {t.fit.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="track-stats">
                    {t.result.map((r) => (
                      <span key={r.label}>
                        <b>{r.n}</b>
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="track-actions">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setOpen(open === t.id ? null : t.id)}
                >
                  {open === t.id ? "收起" : "展开"}
                </button>
                <Link className="line-link" to={`/senior-year/featured-courses/${t.id}`}>
                  方向详情 <Arrow />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TrackDetailView({ t }: { t: Track }) {
  const b = useBooking(`特色方向咨询: ${t.name}`);
  const { teachers } = useTeachers();
  const team = teachers.filter((x) => x.subject === t.subject).slice(0, 3);

  return (
    <>
      {b.modal}
      <Ph tone={1} label={t.en} className="track-hero" />
      <p className="lead">{t.lead}</p>
      <h3>适合人群</h3>
      <div className="rule-grid">
        {t.fit.map((f, i) => (
          <div key={f}>
            <em>{pad(i + 1)}</em>
            <b>{f}</b>
          </div>
        ))}
      </div>
      <h3>课程结构</h3>
      <div className="table wide">
        {t.modules.map((m) => (
          <div key={m.n}>
            <b>{m.n}</b>
            <span>{m.d}</span>
          </div>
        ))}
      </div>
      <h3>方向师资</h3>
      <div className="peer-row">
        {team.map((x) => (
          <Link key={x.id} to={`/faculty/teachers/${x.id}`}>
            <Portrait teacher={x} />
            <b>{x.name}</b>
            <small>{x.role}</small>
          </Link>
        ))}
      </div>
      <h3>往届成效</h3>
      <div className="facts-grid page-stats">
        {t.result.map((r) => (
          <span key={r.label}>
            <b>{r.n}</b>
            {r.label}
          </span>
        ))}
      </div>
      <h3>常见问题</h3>
      <div className="faq-list">
        {t.faq.map((f) => (
          <div className="faq-item open" key={f.q}>
            <button type="button">
              <span>{f.q}</span>
            </button>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
      <div className="inline-cta">
        <div>
          <b>想了解{t.name}是否适合孩子？</b>
          <span>预约一次到校免费学情评估。</span>
        </div>
        <button type="button" className="primary-btn" onClick={b.open}>
          预约专项评估 <Arrow />
        </button>
      </div>
    </>
  );
}
