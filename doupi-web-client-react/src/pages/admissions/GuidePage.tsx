import { useState } from "react";
import { Link } from "react-router-dom";
import { Progress, Checkbox, Steps, Table, Tag } from "antd";
import {
  CalendarOutlined,
  SolutionOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Head } from "@/components/common/LayoutWidgets";
import { Arrow } from "@/components/common/Icons";
import { useClassPlans } from "@/cms/hooks";
import { scholarships, materials } from "@/cms/fallback";
import type { ClassPlan } from "@/cms/types";

export function Seats({ c }: { c: ClassPlan }) {
  const pct = Math.round((c.taken / c.seats) * 100);
  const isUrgent = pct >= 85;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span style={{ color: "#6b7280" }}>班额录取进度</span>
        <span style={{ fontWeight: 600, color: isUrgent ? "#8B1D2C" : "#16a34a" }}>
          已报 {pct}% · 仅余 {c.seats - c.taken} 席
        </span>
      </div>
      <Progress
        percent={pct}
        showInfo={false}
        strokeColor={isUrgent ? "#8B1D2C" : "#10b981"}
        size="small"
      />
    </div>
  );
}

export function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<string[]>([]);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "18px 22px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          报名前材料自检清单（建议提前准备）
        </span>
        <Tag color="#8B1D2C">
          已备齐 {done.length} / {items.length} 项
        </Tag>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map((m) => (
          <Checkbox
            key={m}
            checked={done.includes(m)}
            onChange={(e) =>
              setDone((d) =>
                e.target.checked ? [...d, m] : d.filter((x) => x !== m)
              )
            }
          >
            <span style={{ fontSize: 13, color: "#4b5563" }}>{m}</span>
          </Checkbox>
        ))}
      </div>
    </div>
  );
}

export function GuideBody() {
  const classPlans = useClassPlans();

  const scholarshipColumns = [
    {
      title: "高考成绩区间 / 荣誉门槛",
      dataIndex: "r",
      key: "r",
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: "#1f2937" }}>{text}</span>
      ),
    },
    {
      title: "华襄拔尖助学金 / 减免政策",
      dataIndex: "v",
      key: "v",
      render: (text: string) => (
        <Tag color="#8B1D2C" style={{ borderRadius: 4, fontWeight: 600, padding: "2px 8px" }}>
          {text}
        </Tag>
      ),
    },
  ];

  return (
    <>
      <Head index="ADMISSIONS GUIDE" title="2026 招生简章" />

      {/* 核心报名要点横幅 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          margin: "24px 0 32px",
          background: "#fafafa",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "16px 20px",
        }}
      >
        {[
          ["招生对象", "应往届高三毕业生"],
          ["报名时间", "即日起 — 9 月 30 日"],
          ["开学时间", "2026 年 8 月 26 日"],
          ["插班安排", "全年提供衔接评估插班"],
        ].map(([k, v]) => (
          <div key={k}>
            <small style={{ color: "#475569", fontWeight: 600, display: "block", fontSize: 12 }}>{k}</small>
            <b style={{ color: "#111827", fontSize: 14 }}>{v}</b>
          </div>
        ))}
      </div>

      {/* 现代 Ant Design 4 步报名流程向导 */}
      <h3 style={{ margin: "28px 0 16px", fontFamily: "var(--font-serif)" }}>
        报名与入学全流程
      </h3>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "24px 20px",
          marginBottom: 32,
        }}
      >
        <Steps
          size="small"
          items={[
            {
              title: "预约到校",
              description: "在线预约游园或致电招办，登记基本学情",
              icon: <CalendarOutlined style={{ color: "#8B1D2C" }} />,
            },
            {
              title: "学情诊断",
              description: "到校由学科首席名师一对一全面测评把脉",
              icon: <SolutionOutlined style={{ color: "#8B1D2C" }} />,
            },
            {
              title: "确定班型",
              description: "结合分数与选考，精准匹配分层冲刺班额",
              icon: <CheckCircleOutlined style={{ color: "#8B1D2C" }} />,
            },
            {
              title: "报到开学",
              description: "办理学籍档案登记，领取定制教材入住寝室",
              icon: <TrophyOutlined style={{ color: "#8B1D2C" }} />,
            },
          ]}
        />
      </div>

      {/* 班型设置卡片 */}
      <h3 style={{ margin: "28px 0 16px", fontFamily: "var(--font-serif)" }}>
        分层冲刺班型设置
      </h3>
      <div className="class-grid" style={{ marginBottom: 32 }}>
        {classPlans.map((c) => (
          <Link
            to={`/admissions/guide/${c.id}`}
            className="class-card"
            key={c.id}
            style={{
              textDecoration: "none",
              borderRadius: 8,
              borderTop: "3px solid #8B1D2C",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            <b style={{ color: "#111827", fontSize: 18 }}>{c.name}</b>
            <p style={{ color: "#6b7280", fontSize: 13, minHeight: 38 }}>{c.desc}</p>
            <dl>
              <dt>班额规模</dt>
              <dd>{c.size}</dd>
              <dt>学杂费用</dt>
              <dd>{c.fee}</dd>
            </dl>
            <Seats c={c} />
          </Link>
        ))}
      </div>

      {/* 奖学金政策表格 */}
      <h3 style={{ margin: "28px 0 16px", fontFamily: "var(--font-serif)" }}>
        拔尖助学与高考奖励政策
      </h3>
      <div style={{ marginBottom: 32 }}>
        <Table
          dataSource={scholarships.map((s, index) => ({ ...s, key: index }))}
          columns={scholarshipColumns}
          pagination={false}
          size="middle"
          bordered
          style={{ background: "#ffffff", borderRadius: 8, overflow: "hidden" }}
        />
      </div>

      {/* 报名材料自检清单 */}
      <h3 style={{ margin: "28px 0 16px", fontFamily: "var(--font-serif)" }}>
        报名报到所需材料
      </h3>
      <Checklist items={materials} />

      {/* 行动按钮 */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 24 }}>
        <Link className="primary-btn" to="/admissions/consultation" style={{ background: "#8B1D2C" }}>
          预约咨询与到校测评 <Arrow />
        </Link>
        <button
          type="button"
          className="text-btn"
          onClick={() => window.print()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <PrinterOutlined /> 打印本简章
        </button>
      </div>
    </>
  );
}
