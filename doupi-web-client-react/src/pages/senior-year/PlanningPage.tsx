import { Head, pad } from "@/components/common/LayoutWidgets";
import { Arrow } from "@/components/common/Icons";
import { useBooking } from "@/components/booking";
import { pageContent, planSteps } from "@/cms/fallback";

export function PlanningBody() {
  const b = useBooking("预约学情诊断与升学规划");

  return (
    <>
      {b.modal}
      <Head
        index="PLANNING"
        title="学习规划"
        lead={pageContent["senior-year/planning"].lead}
      />
      <div className="path-steps">
        {planSteps.map((s, i) => (
          <div key={s.t}>
            <em>{pad(i + 1)}</em>
            <div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
            <div className="mini-card">
              <small>示例</small>
              <b>{s.card}</b>
              <i />
              <i />
              <i />
            </div>
          </div>
        ))}
      </div>
      <div className="inline-cta">
        <div>
          <b>免费学情诊断</b>
          <span>带上高考成绩单，到校获得一份专属学科诊断报告。</span>
        </div>
        <button type="button" className="primary-btn" onClick={b.open}>
          预约诊断 <Arrow />
        </button>
      </div>
    </>
  );
}
