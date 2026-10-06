import { Link } from "react-router-dom";
import { Arrow } from "@/components/common/Icons";

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="kicker">404 · PAGE NOT FOUND</p>
      <h1>
        这一页，
        <br />
        还在路上。
      </h1>
      <p>你要找的页面可能已调整位置或正在建设中。</p>
      <div className="hero-actions">
        <Link className="primary-btn" to="/">
          返回首页 <Arrow />
        </Link>
        <Link className="line-link" to="/admissions/consultation">
          预约咨询 <Arrow />
        </Link>
      </div>
    </section>
  );
}
