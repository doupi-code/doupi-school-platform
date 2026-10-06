import { Head, pad } from "@/components/common/LayoutWidgets";
import { researchOrg, prepSteps, researchOutputs, pageContent } from "@/cms/fallback";

export function ResearchBody() {
  return (
    <>
      <Head
        index="RESEARCH"
        title="教研体系"
        lead={pageContent["faculty/research"].lead}
      />
      <h3>教研组织</h3>
      <div className="org-chart">
        {researchOrg.map((o, i) => (
          <div key={o.t} style={{ marginLeft: `${i * 6}%` }}>
            <b>{o.t}</b>
            <span>{o.d}</span>
          </div>
        ))}
      </div>

      <h3>集体备课流程</h3>
      <div className="step-flow">
        {prepSteps.map((s, i) => (
          <div className="step-card" key={s.t}>
            <em>{pad(i + 1)}</em>
            <b>{s.t}</b>
            <p>{s.d}</p>
          </div>
        ))}
      </div>

      <h3>数据驱动</h3>
      <div className="dash">
        <div>
          <small>错题库</small>
          <b>12,480</b>
          <span>道已归档错题</span>
        </div>
        <div>
          <small>高频失分点</small>
          <b>函数 · 电磁感应</b>
          <span>本月 Top 2</span>
        </div>
        <div>
          <small>作业提交率</small>
          <b>98.7%</b>
          <span>近四周平均</span>
        </div>
      </div>

      <h3>教研成果</h3>
      <div className="output-list">
        {researchOutputs.map((o) => (
          <div key={o.t}>
            <time>{o.y}</time>
            <span>{o.t}</span>
          </div>
        ))}
      </div>
    </>
  );
}
