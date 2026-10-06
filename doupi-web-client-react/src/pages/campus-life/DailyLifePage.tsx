import { Head } from "@/components/common/LayoutWidgets";
import { Ph } from "@/components/common/Ph";
import { dayMoments, monthEvents, weekMenu } from "@/cms/fallback";

export function DailyBody() {
  return (
    <>
      <Head
        index="A DAY AT HUAXIANG"
        title="成长日常"
        lead="看见真实的校园生活：从清晨的早读到夜晚的自习，规律的一天，让每一份努力都被认真安排。"
      />
      <div className="day-zigzag">
        {dayMoments.map((s, i) => (
          <div key={s.time} className={i % 2 ? "r" : ""}>
            <time>{s.time}</time>
            <Ph tone={(i % 3) + 1} />
            <div>
              <b>{s.act}</b>
              <p>{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <h3>年度活动</h3>
      <div className="event-row">
        {monthEvents.map((e) => (
          <div key={e.t}>
            <small>{e.m}</small>
            <b>{e.t}</b>
          </div>
        ))}
      </div>

      <h3>本周菜单</h3>
      <div className="menu-table">
        {weekMenu.map((m) => (
          <div key={m.d}>
            <b>{m.d}</b>
            <span>{m.m}</span>
          </div>
        ))}
      </div>
    </>
  );
}
