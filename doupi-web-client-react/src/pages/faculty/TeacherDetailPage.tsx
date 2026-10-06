import { Link } from "react-router-dom";
import { Portrait } from "@/components/common/Portrait";
import { Arrow } from "@/components/common/Icons";
import { useBooking } from "@/components/booking";
import { profileOf } from "./TeachersPage";
import { useTeachers } from "@/cms/hooks";
import type { Teacher } from "@/cms/types";

export function TeacherProfileView({ teacher }: { teacher: Teacher }) {
  const b = useBooking(`预约名师学情诊断: ${teacher.name}老师 (${teacher.subject})`);
  const { teachers } = useTeachers();
  const p = profileOf(teacher);
  const peers = teachers.filter((t) => t.subject === teacher.subject && t.id !== teacher.id);

  return (
    <div className="teacher-profile">
      {b.modal}
      <div className="tp-photo">
        <Portrait teacher={teacher} />
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="primary-btn"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={b.open}
          >
            预约名师诊断 <Arrow />
          </button>
        </div>
      </div>
      <div>
        <p className="article-index">{teacher.role}</p>
        <h2>
          {teacher.name}
          <small>
            {teacher.subject} · {p.title} · 教龄 {p.years} 年
          </small>
        </h2>
        <p className="big-quote small">“{p.motto}”</p>
        <div className="tag-row">
          {(Array.isArray(teacher.tags) ? teacher.tags : []).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="facts-grid page-stats">
          {p.stats.map((s) => (
            <span key={s.label}>
              <b>{s.n}</b>
              {s.label}
            </span>
          ))}
        </div>
        <h3>履历</h3>
        <div className="output-list">
          {p.career.map((c) => (
            <div key={c.y}>
              <time>{c.y}</time>
              <span>{c.t}</span>
            </div>
          ))}
        </div>
        <h3>学生评价</h3>
        <blockquote className="review">
          {p.review}
          <small>— 2026 届学生</small>
        </blockquote>
        {peers.length > 0 && (
          <>
            <h3>同学科其他老师</h3>
            <div className="peer-row">
              {peers.map((t) => (
                <Link key={t.id} to={`/faculty/teachers/${t.id}`}>
                  <Portrait teacher={t} />
                  <b>{t.name}</b>
                  <small>{t.role}</small>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
