import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input, Collapse, Segmented, Tag, Empty, Button } from "antd";
import {
  SearchOutlined,
  QuestionCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Head } from "@/components/common/LayoutWidgets";
import { Arrow } from "@/components/common/Icons";
import { useFaqs } from "@/cms/hooks";

const FAQ_CATS = ["全部", "报名", "费用", "课程", "住宿", "管理", "心理"];

export function FaqBody() {
  const [cat, setCat] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const list = useFaqs(cat, keyword);

  // 转化为 Ant Design Collapse 所需 items
  const collapseItems = useMemo(
    () =>
      list.map((f) => ({
        key: f.q,
        label: (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingRight: 8,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }}>
              {f.q}
            </span>
            <Tag
              color="#fef2f2"
              style={{
                color: "#8B1D2C",
                border: "1px solid #fecaca",
                borderRadius: 4,
                margin: 0,
                fontSize: 11,
              }}
            >
              {f.c}
            </Tag>
          </div>
        ),
        children: (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.85,
              color: "#4b5563",
              background: "#fafafa",
              padding: "12px 16px",
              borderRadius: 6,
            }}
          >
            {f.a}
          </p>
        ),
      })),
    [list]
  );

  return (
    <>
      <Head
        index="FAQ · ADMISSION Q&A"
        title="常见问题解答"
        lead="汇集广大家长与考生在报名手续、课程规划、班型费用及寄宿管理方面的高频关切，助您快速获悉权威答复。"
      />

      {/* 搜索与分类胶囊区 */}
      <div style={{ margin: "24px 0 16px", display: "grid", gap: 14 }}>
        <Input.Search
          size="large"
          prefix={<SearchOutlined style={{ color: "#8B1D2C" }} />}
          placeholder="快速搜索关切问题，如：住宿条件、赋分选考、退费政策、插班手续…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
          enterButton={
            <Button
              type="primary"
              style={{ background: "#8B1D2C", borderColor: "#8B1D2C" }}
            >
              搜索问答
            </Button>
          }
          style={{ width: "100%", maxWidth: 640 }}
        />

        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <Segmented
            options={FAQ_CATS}
            value={cat}
            onChange={(val) => setCat(String(val))}
            style={{
              padding: 4,
              background: "#f3f4f6",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* 现代 Ant Design 折叠问答列表 */}
      <div style={{ marginTop: 16, marginBottom: 36 }}>
        {collapseItems.length > 0 ? (
          <Collapse
            accordion
            items={collapseItems}
            bordered={false}
            expandIconPosition="end"
            expandIcon={({ isActive }) => (
              <RightOutlined
                rotate={isActive ? 90 : 0}
                style={{ color: "#8B1D2C", fontSize: 13, transition: "transform 0.24s" }}
              />
            )}
            style={{
              background: "#ffffff",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        ) : (
          <div
            style={{
              padding: "48px 20px",
              background: "#fafafa",
              borderRadius: 8,
              textAlign: "center",
              border: "1px dashed #e5e7eb",
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "#6b7280" }}>
                  未检索到与“{keyword}”相关的问答条目
                </span>
              }
            />
          </div>
        )}
      </div>

      {/* 底部咨询引导 Card */}
      <div
        className="inline-cta"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: 8,
          borderLeft: "4px solid #8B1D2C",
        }}
      >
        <div>
          <b style={{ fontSize: 18, color: "#1f2937" }}>
            <QuestionCircleOutlined style={{ color: "#8B1D2C", marginRight: 8 }} />
            还有未解答的个性化问题？
          </b>
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            华襄专属招生顾问支持一对一电话沟通或预约到校面谈。
          </span>
        </div>
        <Link className="primary-btn" to="/admissions/consultation" style={{ background: "#8B1D2C" }}>
          预约名师面对面答疑 <Arrow />
        </Link>
      </div>
    </>
  );
}
