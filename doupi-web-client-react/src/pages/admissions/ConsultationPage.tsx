import { Card, Tag } from "antd";
import {
  PhoneOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  ClockCircleOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { Head } from "@/components/common/LayoutWidgets";
import { BookingForm } from "@/components/booking";
import { useSiteConfig } from "@/cms/hooks";

export function ConsultBody() {
  const { config } = useSiteConfig();
  const phone = config.hotlines?.[0] || "027-81777887";
  const subPhone = config.hotlines?.[1] || "027-81777838";

  return (
    <>
      <Head
        index="CONSULTATION · 贵宾预约"
        title="预约咨询与访校评测"
        lead="留下学生基础学情与联系方式，华襄学术顾问将结合往届高考切线，为您定制个性化提分方案与到校参访安排。"
      />
      <div className="consult-split">
        {/* 左侧分步向导表单 */}
        <div
          className="consult-panel"
          style={{
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.03)",
            padding: 24,
          }}
        >
          <BookingForm
            submitLabel="立即提交并生成到校通行证"
            defaultType="预约游园 / 访校参观"
          />
        </div>

        {/* 右侧招办联系信息 Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title={
              <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                招生办公室联系指引
              </span>
            }
            extra={<Tag color="#8B1D2C">官方接待</Tag>}
            style={{ borderRadius: 10, border: "1px solid #e5e7eb" }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <small style={{ color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <PhoneOutlined style={{ color: "#8B1D2C" }} /> 招生专属咨询热线
                </small>
                <div style={{ marginTop: 2 }}>
                  <a
                    href={`tel:${phone}`}
                    style={{ fontSize: 18, fontWeight: 700, color: "#8B1D2C", textDecoration: "none" }}
                  >
                    {phone}
                  </a>
                  <span style={{ color: "#6b7280", fontSize: 13, marginLeft: 10 }}>
                    {subPhone}
                  </span>
                </div>
              </div>

              <div>
                <small style={{ color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <EnvironmentOutlined style={{ color: "#8B1D2C" }} /> 到校详细地址
                </small>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", display: "block", marginTop: 2 }}>
                  {config.address || "武汉市江夏区武汉海淀外国语实验学校（北门华襄教学区）"}
                </span>
              </div>

              <div>
                <small style={{ color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <CompassOutlined style={{ color: "#8B1D2C" }} /> 公共交通路线
                </small>
                <span style={{ fontSize: 13, color: "#4b5563", display: "block", marginTop: 2, lineHeight: 1.6 }}>
                  武汉地铁 7 号线纸坊大街站 C 口出站，换乘 912 路公交至海淀外国语学校北门即达。
                </span>
              </div>

              <div>
                <small style={{ color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <ClockCircleOutlined style={{ color: "#8B1D2C" }} /> 招办接待时段
                </small>
                <span style={{ fontSize: 13, color: "#4b5563", display: "block", marginTop: 2 }}>
                  {config.officeHours || "周一至周日 08:30 — 18:00（节假日无休）"}
                </span>
              </div>
            </div>
          </Card>

          <Card
            style={{ borderRadius: 10, border: "1px solid #e5e7eb", textAlign: "center" }}
            bodyStyle={{ padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <span className="qr-code" style={{ width: 68, height: 68 }} />
              <div style={{ textAlign: "left" }}>
                <b style={{ color: "#111827", fontSize: 14, display: "block" }}>
                  <QrcodeOutlined style={{ color: "#8B1D2C", marginRight: 6 }} />
                  微信直连招生主任
                </b>
                <span style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.5, display: "block", marginTop: 2 }}>
                  扫码添加企业微信，获取《2026年湖北新高考赋分全景图表》电子版
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
