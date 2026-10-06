import { Ph } from "@/components/common/Ph";
import { pad } from "@/components/common/LayoutWidgets";
import { values, threeStyles, refusals } from "@/cms/fallback";

export function PhilosophyBody() {
  return (
    <div className="philo">
      <section className="philo-manifesto">
        <span className="philo-q" aria-hidden="true">
          “
        </span>
        <p className="kicker">OUR BELIEF / 我们相信</p>
        <h2>
          每一次选择，
          <br />
          都值得被<em>认真对待</em>。
        </h2>
        <p className="philo-lead">
          选择复读，是一个需要勇气的决定。我们不把它看作失败后的补救，而是一次带着经验与决心的再出发——为此，我们把一年拆成每一天，把每一天落到实处。
        </p>
      </section>

      <section className="philo-values">
        <div className="philo-sec-head">
          <p className="kicker">CORE VALUES</p>
          <h2>三个关键词</h2>
        </div>
        <div className="pv-grid">
          {values.map((v, i) => (
            <article key={v.w}>
              <Ph tone={i + 1} className="pv-img" />
              <div className="pv-body">
                <div className="pv-top">
                  <em>{pad(i + 1)}</em>
                  <small>{v.en}</small>
                </div>
                <h3>{v.w}</h3>
                <p>{v.d}</p>
                <ul>
                  {v.p.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="philo-motto">
        <Ph tone={2} label="" />
        <div>
          <p className="kicker">OUR MOTTO / 中心口号</p>
          <h2>
            不是复读，
            <br />
            是再出发。
          </h2>
          <span className="philo-seal">华襄</span>
        </div>
      </section>

      <section className="philo-styles">
        <div className="philo-sec-head">
          <p className="kicker">THREE CULTURES</p>
          <h2>三风</h2>
        </div>
        <div>
          {threeStyles.map((x) => (
            <div key={x.t}>
              <span className="ps-char">{x.t[0]}</span>
              <small>{x.t}</small>
              <b>{x.d}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="philo-refuse">
        <div className="philo-sec-head">
          <p className="kicker">WHAT WE WON'T DO</p>
          <h2>我们坚持不做的事</h2>
        </div>
        <ol>
          {refusals.map((r, i) => (
            <li key={r.t}>
              <em>{pad(i + 1)}</em>
              <b>{r.t}</b>
              <span>{r.d}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
