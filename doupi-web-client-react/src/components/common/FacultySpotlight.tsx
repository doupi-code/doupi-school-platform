import { useState } from "react";
import { Link } from "react-router-dom";
import { Segmented, Tag, Button } from "antd";
import { Arrow } from "./Icons";
import { Portrait, groupOf, facultyTabs } from "./Portrait";
import { useTeachers } from "@/cms/hooks";
import type { FacultyGroup } from "@/cms/types";

export function FacultySpotlight() {
  const { teachers } = useTeachers();
  const tabs = facultyTabs.filter((tab) =>
    teachers.some((t) => groupOf(t) === tab.id)
  );
  const [active, setActive] = useState<FacultyGroup>(tabs[0]?.id ?? "principal");
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = teachers.filter((t) => groupOf(t) === active);

  return (
    <section className="faculty-spotlight">
      <div className="section-row">
        <div>
          <p className="kicker">OUR FACULTY · 名师团队</p>
          <h2>特级领衔，学术天团</h2>
        </div>
        <Link className="line-link" to="/faculty/teachers">
          查看全体名师名录 <Arrow />
        </Link>
      </div>

      {/* 现代 Ant Design Segmented 分类胶囊 */}
      <div style={{ margin: "24px 0 28px" }}>
        <Segmented
          options={tabs.map((t) => ({ label: t.label, value: t.id }))}
          value={active}
          onChange={(val) => {
            setActive(val as FacultyGroup);
            setExpanded(null);
          }}
          size="large"
          style={{
            background: "#f3f4f6",
            padding: 4,
            borderRadius: 8,
          }}
        />
      </div>

      {active === "principal" ? (
        <div className="principal-list">
          {list.map((t) => {
            const tags = Array.isArray(t.tags) ? t.tags : [];
            const isExp = expanded === t.id;
            return (
              <div
                className="principal-card"
                key={t.id}
                style={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.03)",
                  transition: "all 0.2s ease",
                }}
              >
                <Portrait teacher={t} />
                <div className="principal-body">
                  <p style={{ color: "#8B1D2C", fontWeight: 600 }}>{t.role}</p>
                  <b style={{ color: "#111827", fontSize: 24 }}>{t.name}</b>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 10px" }}>
                    {tags.map((tag) => (
                      <Tag color="#fef2f2" style={{ color: "#8B1D2C", border: "1px solid #fecaca", borderRadius: 4, margin: 0 }} key={tag}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                  {isExp && (
                    <em style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.8, display: "block", marginBottom: 12 }}>
                      {t.intro}
                    </em>
                  )}
                  <Button
                    type="link"
                    style={{ color: "#8B1D2C", padding: 0, fontWeight: 600 }}
                    onClick={() => setExpanded(isExp ? null : t.id)}
                  >
                    {isExp ? "收起简介 ↑" : "展开专家学术履历 ↓"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="faculty-tab-grid">
          {list.map((t) => (
            <Link
              className="faculty-mini"
              to={`/faculty/teachers/${t.id}`}
              key={t.id}
              style={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                textDecoration: "none",
              }}
            >
              <Portrait teacher={t} />
              <div>
                <p style={{ color: "#8B1D2C", fontWeight: 600 }}>{t.role}</p>
                <b style={{ color: "#111827", fontSize: 18 }}>{t.name}</b>
                <span style={{ color: "#6b7280", fontSize: 13, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {t.intro}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function ManagementPreview() {
  const { teachers } = useTeachers();
  return (
    <section className="management-preview">
      <div className="subheading">
        <p className="article-index">MANAGEMENT TEAM</p>
        <h3>管理团队</h3>
      </div>
      <div className="management-grid">
        {teachers
          .filter((t) => t.category === "management")
          .map((t) => (
            <Link to={`/faculty/teachers/${t.id}`} className="management-card" key={t.id}>
              <Portrait teacher={t} />
              <div>
                <p>{t.role}</p>
                <b>{t.name}</b>
                <span>{Array.isArray(t.tags) ? t.tags[0] : ""}</span>
              </div>
              <Arrow />
            </Link>
          ))}
      </div>
    </section>
  );
}
