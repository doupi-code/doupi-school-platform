import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input, Tag, Empty, type InputRef } from "antd";
import {
  SearchOutlined,
  BookOutlined,
  UserOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { Close } from "./Icons";
import {
  defaultNavigation,
  defaultArticles,
  defaultTeachers,
  defaultFaqList,
} from "@/cms/fallback";

const HOT_WORDS = [
  "招生简章",
  "冲刺班型",
  "费用与奖学金",
  "学生公寓",
  "高三选考",
  "高考倒计时",
];

interface SearchItem {
  t: string;
  d: string;
  to: string;
  category: "navigation" | "article" | "teacher" | "faq";
}

export function SearchBar({ close }: { close: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<InputRef>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const index = useMemo<SearchItem[]>(
    () => [
      ...defaultNavigation.flatMap((n) => [
        {
          t: n.title,
          d: n.desc || n.en,
          to: `/${n.slug}`,
          category: "navigation" as const,
        },
        ...(n.children ?? []).map((c) => ({
          t: c.title,
          d: c.desc || n.title,
          to: `/${n.slug}/${c.slug}`,
          category: "navigation" as const,
        })),
      ]),
      ...defaultArticles.map((a) => ({
        t: a.title,
        d: `${a.date} · ${a.category}`,
        to: `/news/${a.kind}/${a.id}`,
        category: "article" as const,
      })),
      ...defaultTeachers.map((t) => ({
        t: `${t.name} · ${t.subject}首席名师`,
        d: `${t.role} · ${(Array.isArray(t.tags) ? t.tags : []).join(" ")}`,
        to: `/faculty/teachers/${t.id}`,
        category: "teacher" as const,
      })),
      ...defaultFaqList.map((f) => ({
        t: f.q,
        d: f.a.slice(0, 48) + "...",
        to: "/admissions/faq",
        category: "faq" as const,
      })),
    ],
    []
  );

  const cleanQ = q.trim().toLowerCase();
  const hits = cleanQ
    ? index
        .filter((x) => (x.t + x.d).toLowerCase().includes(cleanQ))
        .slice(0, 8)
    : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (hits[0]) {
      navigate(hits[0].to);
      close();
    }
  };

  const getCategoryMeta = (cat: SearchItem["category"]) => {
    switch (cat) {
      case "teacher":
        return {
          label: "名师团队",
          icon: <UserOutlined style={{ color: "#8B1D2C" }} />,
          color: "red",
        };
      case "article":
        return {
          label: "资讯公告",
          icon: <FileTextOutlined style={{ color: "#2563eb" }} />,
          color: "blue",
        };
      case "faq":
        return {
          label: "问答解答",
          icon: <QuestionCircleOutlined style={{ color: "#059669" }} />,
          color: "green",
        };
      default:
        return {
          label: "栏目专页",
          icon: <BookOutlined style={{ color: "#d97706" }} />,
          color: "gold",
        };
    }
  };

  return (
    <div
      className="search-overlay"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "clamp(40px, 12vh, 100px)",
      }}
    >
      <div
        className="spotlight-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 94vw)",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(229, 231, 235, 0.8)",
          overflow: "hidden",
        }}
      >
        {/* 顶部搜索输入框 */}
        <form onSubmit={submit} style={{ padding: "16px 20px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Input
              ref={inputRef}
              size="large"
              prefix={
                <SearchOutlined
                  style={{ color: "#8B1D2C", fontSize: 20, marginRight: 6 }}
                />
              }
              placeholder="搜索课程班型、名师团队、招生政策、校园问答…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              allowClear
              variant="borderless"
              style={{
                fontSize: 16,
                padding: "4px 0",
              }}
            />
            <button
              type="button"
              onClick={close}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: "50%",
                color: "#6b7280",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Close />
            </button>
          </div>
        </form>

        <div style={{ borderTop: "1px solid #f3f4f6" }} />

        {/* 搜索结果或热门标签区 */}
        <div style={{ padding: "16px 20px", maxHeight: 380, overflowY: "auto" }}>
          {cleanQ ? (
            hits.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {hits.map((h, idx) => {
                  const meta = getCategoryMeta(h.category);
                  return (
                    <Link
                      key={h.to + idx}
                      to={h.to}
                      onClick={close}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#fafafa",
                        border: "1px solid #f3f4f6",
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fdf2f2";
                        e.currentTarget.style.borderColor = "#fecaca";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fafafa";
                        e.currentTarget.style.borderColor = "#f3f4f6";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 16, display: "inline-flex" }}>
                          {meta.icon}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <b
                            style={{
                              display: "block",
                              fontSize: 14,
                              color: "#1f2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h.t}
                          </b>
                          <small
                            style={{
                              color: "#6b7280",
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                            }}
                          >
                            {h.d}
                          </small>
                        </div>
                      </div>
                      <Tag color={meta.color} style={{ margin: 0, borderRadius: 4, flexShrink: 0 }}>
                        {meta.label}
                      </Tag>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <Empty description={<span style={{ color: "#6b7280" }}>没有找到与“{q}”相关的内容</span>} />
              </div>
            )
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#8B1D2C",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                <FireOutlined /> 热门搜索关键词
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {HOT_WORDS.map((w) => (
                  <Tag.CheckableTag
                    key={w}
                    checked={false}
                    onChange={() => setQ(w)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 16,
                      fontSize: 13,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {w}
                  </Tag.CheckableTag>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部快捷键操作小提示 */}
        <div
          style={{
            padding: "8px 20px",
            background: "#fafafa",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          <span>按 [回车] 直达首条匹配结果</span>
          <span>按 [ESC] 退出搜索</span>
        </div>
      </div>
    </div>
  );
}
