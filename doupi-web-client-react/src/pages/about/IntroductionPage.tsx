import { Head } from "@/components/common/LayoutWidgets";
import { Ph } from "@/components/common/Ph";
import { Portrait } from "@/components/common/Portrait";
import { pageContent, historyline, honors } from "@/cms/fallback";
import { useTeachers } from "@/cms/hooks";

export function IntroductionBody() {
  const { teachers } = useTeachers();
  const head = teachers.find((t) => t.role === "华襄复读中心主任") ?? teachers[0];

  return (
    <>
      <Head index="ABOUT US" title="中心简介" />
      <div className="intro-split">
        <p className="big-quote">
          只做高三复读，
          <br />
          只做好这一年。
        </p>
        <div>
          <p>{pageContent["about/introduction"].lead}</p>
          <p>
            中心依托武汉海淀外国语实验学校的校园与办学资源，由名校管理骨干与学科首席教师领衔，沿用成熟的高三备考体系，将大目标拆解为可执行的每周计划。
          </p>
        </div>
      </div>
      <div className="facts-grid page-stats">
        {(pageContent.about.stats ?? []).map((s) => (
          <span key={s.label}>
            <b>{s.n}</b>
            {s.label}
          </span>
        ))}
      </div>
      <h3>发展历程</h3>
      <div className="h-timeline">
        {historyline.map((h) => (
          <div key={h.y}>
            <b>{h.y}</b>
            <p>{h.t}</p>
          </div>
        ))}
      </div>
      {head && (
        <div className="letter">
          <Portrait teacher={head} />
          <div>
            <p className="kicker">LETTER</p>
            <p>
              亲爱的同学：选择复读，意味着你没有放弃对更好结果的期待。在华襄，我们会和你一起，把这份不甘变成每天具体的行动。一年之后，希望你回望这段时光，记得的不只是辛苦，还有一个更清楚、更有力量的自己。
            </p>
            <b className="sign">{head.name}</b>
            <small>{head.role}</small>
          </div>
        </div>
      )}
      <h3>荣誉资质</h3>
      <div className="honor-wall">
        {honors.map((h, i) => (
          <div key={h}>
            <Ph tone={(i % 3) + 1} />
            <span>{h}</span>
          </div>
        ))}
      </div>
    </>
  );
}
