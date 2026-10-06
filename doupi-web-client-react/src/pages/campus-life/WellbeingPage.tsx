import { Head } from "@/components/common/LayoutWidgets";
import { Ph } from "@/components/common/Ph";
import { careTiers, moodStages, pageContent } from "@/cms/fallback";

export function WellbeingBody() {
  return (
    <div className="calm">
      <Head
        index="WELLBEING"
        title="心理关怀"
        lead={pageContent["campus-life/wellbeing"].lead}
      />
      <h3>三线支持</h3>
      <div className="tiers">
        {careTiers.map((c) => (
          <div key={c.t}>
            <small>{c.n}</small>
            <b>{c.t}</b>
            <p>{c.d}</p>
          </div>
        ))}
      </div>

      <h3>一年里的情绪曲线</h3>
      <div className="mood">
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C 60 30, 90 60, 130 70 S 200 110, 240 95 S 320 40, 400 55" />
        </svg>
        <div className="mood-stages">
          {moodStages.map((m) => (
            <div key={m.t}>
              <small>{m.m}</small>
              <b>{m.t}</b>
              <span>{m.d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="care-room">
        <Ph tone={2} label="心理咨询室" />
        <div>
          <h3>匿名预约</h3>
          <p>
            咨询室位于教学楼三楼，每天 12:30—14:00、17:30—18:30 开放。可在教室门口信箱投递预约卡，无需署名，心理老师会通过班级编号联系你。咨询内容全程保密。
          </p>
        </div>
      </div>
    </div>
  );
}
