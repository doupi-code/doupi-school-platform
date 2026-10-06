import { useState } from "react";
import { Link } from "react-router-dom";
import { Segmented, Image, Tag } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { Head, pad } from "@/components/common/LayoutWidgets";
import { Ph } from "@/components/common/Ph";
import { useFacilities } from "@/cms/hooks";
import { pageContent } from "@/cms/fallback";
import type { Facility } from "@/cms/types";

const ZONES = ["教学", "生活", "运动", "安全"];

export function CampusBody() {
  const [zone, setZone] = useState("教学");
  const { facilities } = useFacilities();

  return (
    <>
      <Head
        index="CAMPUS TOUR · 校园环境"
        title="现代化生态红砖校园"
        lead="独门独院高三专属教学区、高标准理化生实验室、自习答疑中心、千人礼堂与运动场馆，共同支撑专注而从容的备考时光。"
      />

      {/* 校园手绘导览图 */}
      <div className="campus-map" style={{ borderRadius: 10, overflow: "hidden" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 50 C 30 46, 60 56, 96 50" />
          <path d="M50 4 C 48 40, 54 70, 50 96" />
        </svg>
        {facilities.map((f) => (
          <Link
            key={f.id}
            to={`/about/campuses/${f.id}`}
            className={f.zone === zone ? "pin on" : "pin"}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            <i />
            {f.name}
          </Link>
        ))}
        <span className="map-n">N ↑</span>
      </div>

      {/* 现代 Ant Design Segmented 区域切换 */}
      <div style={{ margin: "24px 0 20px" }}>
        <Segmented
          options={ZONES.map((z) => ({
            label: (
              <span style={{ padding: "0 8px" }}>
                {z}区
                {z === "生活" || z === "安全" ? (
                  <Tag color="#8B1D2C" style={{ marginLeft: 6, fontSize: 10, borderRadius: 2 }}>
                    家长关切
                  </Tag>
                ) : null}
              </span>
            ),
            value: z,
          }))}
          value={zone}
          onChange={(z) => setZone(String(z))}
          size="large"
          style={{
            background: "#f3f4f6",
            padding: 4,
            borderRadius: 8,
          }}
        />
      </div>

      {/* 设施卡片网格 */}
      <div className="facility-grid">
        {facilities
          .filter((f) => f.zone === zone)
          .map((f, i) => (
            <Link
              to={`/about/campuses/${f.id}`}
              className={`facility-card v${(i % 3) + 1}`}
              key={f.id}
              style={{ borderRadius: 8 }}
            >
              <span className="facility-label">{f.name}</span>
              <small>{f.specs.join(" · ")}</small>
            </Link>
          ))}
      </div>

      {/* 校园数据看板 */}
      <div className="facts-grid page-stats">
        {(pageContent["about/campuses"].stats ?? []).map((s) => (
          <span key={s.label}>
            <b>{s.n}</b>
            {s.label}
          </span>
        ))}
      </div>
    </>
  );
}

export function FacilityDetailView({ f }: { f: Facility }) {
  const { facilities } = useFacilities();
  const i = facilities.findIndex((item) => item.id === f.id);
  const safeIndex = i >= 0 ? i : 0;
  const prev = facilities[(safeIndex - 1 + facilities.length) % facilities.length] || f;
  const next = facilities[(safeIndex + 1) % facilities.length] || f;

  return (
    <>
      {/* 现代 Ant Design 图像画廊预览器（支持滚轮缩放、旋转、全屏画廊） */}
      <div style={{ marginBottom: 24 }}>
        <Image.PreviewGroup>
          <div className="gallery">
            {[1, 2, 3, 1].map((t, k) => (
              <div key={k} className={k === 0 ? "g-main" : ""} style={{ borderRadius: 8, overflow: "hidden" }}>
                <Image
                  src={f.imageUrl || undefined}
                  fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'><rect width='100%' height='100%' fill='%23f3f4f6'/></svg>"
                  alt={f.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  placeholder={<Ph tone={t} label={k === 0 ? f.name : undefined} />}
                />
              </div>
            ))}
          </div>
        </Image.PreviewGroup>
      </div>

      <p className="lead" style={{ fontSize: 16, lineHeight: 1.8, color: "#374151" }}>
        {f.desc}
      </p>

      <div className="key-strip" style={{ borderRadius: 8, overflow: "hidden" }}>
        {f.specs.map((s, k) => (
          <div key={s}>
            <small>核心参数 {pad(k + 1)}</small>
            <b>{s}</b>
          </div>
        ))}
        <div>
          <small>开放/服务时段</small>
          <b>{f.hours}</b>
        </div>
      </div>

      <h3 style={{ margin: "24px 0 12px", fontFamily: "var(--font-serif)" }}>
        <EnvironmentOutlined style={{ color: "#8B1D2C", marginRight: 8 }} />
        设施所在方位
      </h3>
      <div className="campus-map small" style={{ borderRadius: 8, overflow: "hidden" }}>
        {facilities.map((x) => (
          <Link
            key={x.id}
            to={`/about/campuses/${x.id}`}
            className={x.id === f.id ? "pin on" : "pin"}
            style={{ left: `${x.x}%`, top: `${x.y}%` }}
          >
            <i />
            {x.id === f.id ? x.name : ""}
          </Link>
        ))}
      </div>

      <div className="doc-nav" style={{ marginTop: 24 }}>
        <Link to={`/about/campuses/${prev.id}`}>← 上一处：{prev.name}</Link>
        <Link to={`/about/campuses/${next.id}`}>下一处：{next.name} →</Link>
      </div>
    </>
  );
}
