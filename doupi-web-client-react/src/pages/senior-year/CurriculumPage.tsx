import { Head } from "@/components/common/LayoutWidgets";
import { subjectMatrix, examMarks, weekGrid, slotLabel, type Slot } from "@/cms/fallback";

const stages = [
  {
    phase: "第一阶段",
    title: "夯实基础",
    focus: "9 月 — 次年 2 月",
    points: ["按考纲重建学科知识框架", "补齐薄弱知识点", "建立稳定的学习节奏"],
  },
  {
    phase: "第二阶段",
    title: "专题突破",
    focus: "3 月 — 4 月",
    points: ["高频考点专题训练", "错题复盘与方法优化", "分层限时训练"],
  },
  {
    phase: "第三阶段",
    title: "冲刺提升",
    focus: "5 月 — 高考",
    points: ["综合模拟与应试训练", "心态与节奏调整", "查漏补缺、稳定发挥"],
  },
];

export function CurriculumBody() {
  const max = Math.max(...subjectMatrix.map((s) => s.h));

  return (
    <>
      <Head
        index="CURRICULUM"
        title="课程体系"
        lead="以夯实基础、专题突破与分层提升为主线，把一年拆解为三个清晰的阶段，让努力持续产生回音。"
      />
      <div className="stage-timeline">
        {stages.map((s, i) => (
          <div className="stage-item" key={s.title}>
            <div className="stage-marker">
              <em>{i + 1}</em>
            </div>
            <div className="stage-body">
              <span className="stage-phase">
                {s.phase} · {s.focus}
              </span>
              <h3>{s.title}</h3>
              <ul>
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <h3>考试节奏</h3>
      <div className="exam-rail">
        {examMarks.map((e) => (
          <div key={e.t}>
            <i />
            <small>{e.m}</small>
            <span>{e.t}</span>
          </div>
        ))}
      </div>

      <h3>学科课时（每周）</h3>
      <div className="subject-bars">
        {subjectMatrix.map((s) => (
          <div key={s.s}>
            <span>{s.s}</span>
            <i style={{ width: `${(s.h / max) * 100}%` }} />
            <b>{s.h}</b>
          </div>
        ))}
      </div>

      <h3>周课表样例</h3>
      <div className="week-grid">
        {weekGrid.map((d) => (
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
      <div className="slot-legend">
        {(Object.keys(slotLabel) as Slot[]).map((k) => (
          <span key={k}>
            <i className={`slot ${k}`} />
            {slotLabel[k]}
          </span>
        ))}
      </div>
    </>
  );
}
