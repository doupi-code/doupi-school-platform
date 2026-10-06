import { Head, pad } from "@/components/common/LayoutWidgets";
import { loopNodes, rules } from "@/cms/fallback";

export function TeachingBody() {
  return (
    <>
      <Head index="MANAGEMENT" title="教学管理" lead="我们不靠题海，靠的是每一天都不留问题。" />
      <div className="triad">
        {["日清", "周结", "月测"].map((w, i) => (
          <div key={w}>
            <b>{w}</b>
            <span>{["当天问题当天清", "每周阶段复盘", "每月统一检测"][i]}</span>
          </div>
        ))}
      </div>

      <h3>教学闭环</h3>
      <div className="loop">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="74" />
        </svg>
        {loopNodes.map((n, i) => {
          const a = (i / loopNodes.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <span
              key={n}
              style={{
                left: `${50 + Math.cos(a) * 37}%`,
                top: `${50 + Math.sin(a) * 37}%`,
              }}
            >
              <em>{pad(i + 1)}</em>
              {n}
            </span>
          );
        })}
        <b className="loop-core">
          每个学生
          <br />
          每一天
        </b>
      </div>

      <h3>管理制度</h3>
      <div className="rule-grid">
        {rules.map((r, i) => (
          <div key={r.t}>
            <em>{pad(i + 1)}</em>
            <b>{r.t}</b>
            <p>{r.d}</p>
          </div>
        ))}
      </div>

      <h3>家长每周收到的学情报告</h3>
      <div className="report-mock">
        <div>
          <small>第 6 周 · 学情报告</small>
          <b>陈同学</b>
        </div>
        {[
          ["语文", 78],
          ["数学", 64],
          ["英语", 86],
          ["物理", 58],
        ].map(([s, v]) => (
          <div className="rm-row" key={s}>
            <span>{s}</span>
            <i style={{ width: `${v}%` }} />
            <b>{v}%</b>
          </div>
        ))}
        <p>本周作业完成率 100%，数学函数专题仍需加强，已安排周六个别辅导。</p>
      </div>
    </>
  );
}
