import { Link } from "react-router-dom";
import { useArticles } from "@/cms/hooks";
import type { Article } from "@/cms/types";
import baseballActivity from "@/assets/baseball-activity.gif";
import campusEnvironment from "@/assets/campus-environment.jpg";

export function ArticleDetailView({ a }: { a: Article }) {
  const { articles: list } = useArticles(a.kind);
  const i = list.findIndex((item) => String(item.id) === String(a.id));
  const safeIndex = i >= 0 ? i : 0;
  const prev = safeIndex > 0 ? list[safeIndex - 1] : undefined;
  const next = safeIndex < list.length - 1 ? list[safeIndex + 1] : undefined;

  if (a.kind === "notices") {
    return (
      <div className="notice-doc">
        <h2>{a.title}</h2>
        <p className="doc-meta">
          发布单位：{a.author || "汉外华襄校办"}　发布日期：{a.date}
        </p>
        {(a.body || []).map((p, k) => (
          <p key={k}>{p}</p>
        ))}
        {a.attachments && a.attachments.length > 0 && (
          <div className="attach">
            <b>官方附件下载</b>
            {a.attachments.map((f) => (
              <button type="button" key={f} onClick={() => alert(`正在为您下载附件：${f}`)}>
                📎 {f}
              </button>
            ))}
          </div>
        )}
        <p className="doc-sign">
          {a.author || "汉外华襄复读中心"}
          <br />
          {a.date.replace(/\./g, " 年 ").replace(/ 年 (\d+)$/, " 月 $1 日")}
        </p>
        <div className="doc-nav">
          {prev && <Link to={`/news/notices/${prev.id}`}>上一篇：{prev.title}</Link>}
          {next && <Link to={`/news/notices/${next.id}`}>下一篇：{next.title}</Link>}
          <button type="button" className="text-btn" onClick={() => window.print()}>
            打印公文
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reader">
      <small className="reader-meta">
        {a.category} · {a.date} · {a.author || "汉外华襄新闻社"}
      </small>
      <h2>{a.title}</h2>
      {a.kind === "updates" && (
        <figure>
          <img
            src={a.coverUrl || (a.id === "baseball" ? baseballActivity : campusEnvironment)}
            alt=""
          />
          <figcaption>图｜汉外华襄复读中心实景记录</figcaption>
        </figure>
      )}
      {(a.body || []).map((p, k) =>
        k === 1 ? <blockquote key={k}>{p}</blockquote> : <p key={k}>{p}</p>
      )}
      <div className="share">
        <span>分享阅读</span>
        <span className="qr-code" />
        <small>微信扫码至手机端阅读</small>
      </div>
      <div className="doc-nav">
        {prev && <Link to={`/news/${a.kind}/${prev.id}`}>上一篇：{prev.title}</Link>}
        {next && <Link to={`/news/${a.kind}/${next.id}`}>下一篇：{next.title}</Link>}
      </div>
      <h3>相关阅读</h3>
      <div className="output-list">
        {list
          .filter((x) => String(x.id) !== String(a.id))
          .slice(0, 3)
          .map((x) => (
            <Link key={x.id} to={`/news/${x.kind}/${x.id}`}>
              <time>{x.date}</time>
              <span>{x.title}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
