import { Link } from "react-router-dom";
import { Arrow } from "@/components/common/Icons";
import { useBooking } from "@/components/booking";
import { useClassPlans } from "@/cms/hooks";
import { weekGrid, slotLabel, materials } from "@/cms/fallback";
import { Seats, Checklist } from "./GuidePage";
import type { ClassPlan } from "@/cms/types";

export function ClassDetailView({ c }: { c: ClassPlan }) {
  const b = useBooking(`预留学位咨询: ${c.name}`);
  const classPlans = useClassPlans();

  return (
    <>
      {b.modal}
      <p className="lead">{c.desc}</p>
      <div className="key-strip">
        {[
          ["班额", c.size],
          ["课时", c.hours],
          ["住宿", c.dorm],
          ["费用", c.fee],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>

      <h3>入班要求</h3>
      <div className="rule-grid">
        {c.req.map((r, i) => (
          <div key={r}>
            <em>{String(i + 1).padStart(2, "0")}</em>
            <b>{r}</b>
          </div>
        ))}
      </div>

      <h3>课表样例</h3>
      <div className="week-grid">
        {weekGrid.slice(0, 6).map((d) => (
          <div key={d.d}>
            <b>{d.d}</b>
            {d.s.map((x, i) => (
              <span key={i} className={`slot ${x}`}>
                {slotLabel[x].slice(0, 2)}
              </span>
            ))}
          </div>
        ))}
      </div>

      <h3>名额</h3>
      <Seats c={c} />

      <h3>报名材料</h3>
      <Checklist items={materials} />

      <div className="guide-actions">
        <button type="button" className="primary-btn" onClick={b.open}>
          预约该班型 / 锁定名额 <Arrow />
        </button>
      </div>

      <h3>班型对比</h3>
      <div className="compare">
        {["", "班额", "课时", "入班要求"].map((h) => (
          <b key={h}>{h}</b>
        ))}
        {classPlans.map((x) => [
          <Link key={x.id} to={`/admissions/guide/${x.id}`} className={x.id === c.id ? "on" : ""}>
            {x.name}
          </Link>,
          <span key={x.id + "s"}>{x.size}</span>,
          <span key={x.id + "h"}>{x.hours}</span>,
          <span key={x.id + "r"}>{x.req[0]}</span>,
        ])}
      </div>
    </>
  );
}
