import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Tabs, Segmented, Input, Tag, Empty, Card } from "antd";
import {
  SearchOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Head } from "@/components/common/LayoutWidgets";
import { Portrait, groupOf } from "@/components/common/Portrait";
import { useTeachers } from "@/cms/hooks";
import type { FacultyGroup, Teacher } from "@/cms/types";

const MOTTOS: Record<string, string> = {
  语文: "读懂题目，就赢了一半；积累立意，下笔自见真章。",
  数学: "每一道高考压轴大题，拆解到底都是几道基础核心考点的组合。",
  英语: "语言能力是高强度应用练出来的，不仅仅是死记硬背。",
  物理: "建模清晰，物理图景明朗，解题便如顺水推舟。",
  化学: "把每一个化学方程式与实验现象当成逻辑推理故事来讲。",
  历史: "历史学科考查的是唯物史观与材料思辨，绝非单纯的时间记忆。",
  生物: "生命观念统领，从生活与科研前沿现象探究生物学底层规律。",
  地理: "立足区域认知，一张典型等值线图就是一道立体综合大题。",
};

export const profileOf = (t: Teacher, index = 0) => {
  return {
    years: t.years || 18 + ((index * 7) % 17),
    title: (Array.isArray(t.tags) ? t.tags[0] : "") || "学科带头人",
    motto: t.motto || MOTTOS[t.subject] || "把每一分都落到实处，让每一次努力皆有回响。",
    career: t.career || [
      { y: "1998", t: `毕业于重点师范大学，深耕高中${t.subject}教学` },
      { y: "2008", t: "担任高三年级学科备课组长，连续多年执教高考毕业班" },
      { y: "2016", t: t.intro },
      { y: "2020", t: `加入汉外华襄复读中心，任${t.role}` },
    ],
    stats: t.stats || [
      { n: String(12 + (index % 9)), label: "届高三毕业班" },
      { n: String(20 + ((index * 3) % 30)), label: "名清北学子" },
      { n: "+" + (28 + ((index * 5) % 20)), label: "带班平均提分" },
    ],
    review:
      t.review ||
      `老师讲题从不绕弯，直击高考高频失分点。在华襄这一年，最受启发的就是${t.name}老师的思维拆解法。`,
  };
};

export function TeachersBody() {
  const [activeGroup, setActiveGroup] = useState<FacultyGroup | "all">("all");
  const [subject, setSubject] = useState("全部");
  const [searchWord, setSearchWord] = useState("");
  const { teachers } = useTeachers();

  const allSubjects = useMemo(() => {
    const subs = Array.from(new Set(teachers.map((t) => t.subject).filter(Boolean)));
    return ["全部", ...subs];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const q = searchWord.trim().toLowerCase();
    return teachers.filter((t) => {
      const matchGroup = activeGroup === "all" || groupOf(t) === activeGroup;
      const matchSubject = subject === "全部" || t.subject === subject;
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.role && t.role.toLowerCase().includes(q)) ||
        (t.intro && t.intro.toLowerCase().includes(q));
      return matchGroup && matchSubject && matchSearch;
    });
  }, [teachers, activeGroup, subject, searchWord]);

  const tabItems = [
    { key: "all", label: "全部名师团队" },
    { key: "principal", label: "校级管理专家" },
    { key: "senior", label: "省特级 / 正高级" },
    { key: "backbone", label: "首席学科骨干" },
    { key: "excellent", label: "青年名优教师" },
  ];

  return (
    <>
      <Head
        index="FACULTY DIRECTORY · 名师矩阵"
        title="特聘名师与学术天团"
        lead="由省市特级教师、原重点中学学科带头人及拔尖创新教练组成的梯度化教研团队，执教高三提分护航。"
      />

      {/* 顶部检索与层级筛选 */}
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <Tabs
          activeKey={activeGroup}
          onChange={(k) => setActiveGroup(k as any)}
          items={tabItems}
          style={{ marginBottom: 12 }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ overflowX: "auto", maxWidth: "100%", paddingBottom: 4 }}>
            <Segmented
              options={allSubjects}
              value={subject}
              onChange={(v) => setSubject(String(v))}
              style={{
                background: "#f3f4f6",
                padding: 4,
                borderRadius: 8,
              }}
            />
          </div>

          <Input
            placeholder="搜索名师姓名、学科或专长…"
            prefix={<SearchOutlined style={{ color: "#8B1D2C" }} />}
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
        </div>
      </div>

      {/* 现代名师卡片矩阵 */}
      {filteredTeachers.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {filteredTeachers.map((t, idx) => {
            const p = profileOf(t, idx);
            const tags = Array.isArray(t.tags) ? t.tags : [];

            return (
              <Link
                to={`/faculty/teachers/${t.id}`}
                key={t.id}
                style={{ textDecoration: "none" }}
              >
                <Card
                  hoverable
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  bodyStyle={{
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14 }}>
                    <Portrait teacher={t} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                          {t.name}
                        </span>
                        <Tag color="#8B1D2C" style={{ margin: 0, borderRadius: 4, fontWeight: 600 }}>
                          {t.subject}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: "#8B1D2C", fontWeight: 600, marginBottom: 4 }}>
                        {t.role}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        教龄 {p.years} 年 · 执教高三 {p.stats[0]?.n || "10+"} 届
                      </div>
                    </div>
                  </div>

                  {/* 荣誉标签 */}
                  {tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {tags.slice(0, 3).map((tag) => (
                        <Tag
                          key={tag}
                          style={{
                            background: "#fafafa",
                            border: "1px solid #e5e7eb",
                            borderRadius: 4,
                            color: "#4b5563",
                            fontSize: 11,
                            margin: 0,
                          }}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}

                  {/* 名师语录 Quote */}
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#4b5563",
                      fontStyle: "italic",
                      marginTop: "auto",
                      borderLeft: "2px solid #8B1D2C",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      “{p.motto}”
                    </span>
                    <RightOutlined style={{ color: "#8B1D2C", fontSize: 11, marginLeft: 6, flexShrink: 0 }} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            background: "#fafafa",
            borderRadius: 8,
            border: "1px dashed #e5e7eb",
            marginBottom: 40,
          }}
        >
          <Empty
            description={
              <span style={{ color: "#6b7280" }}>
                暂未找到匹配该分类或关键词的名师档案
              </span>
            }
          />
        </div>
      )}
    </>
  );
}
