import { useState, useEffect, type FormEvent } from "react";
import {
  ConfigProvider,
  Input,
  Button,
  Tag,
  Empty,
  Spin,
  Alert,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import {
  PhoneOutlined,
  SearchOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { Close } from "@/components/common/Icons";
import { portalApi, type BookingRecord } from "@/api/portal";

interface BookingQueryModalProps {
  close: () => void;
}

export function BookingQueryModal({ close }: BookingQueryModalProps) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [records, setRecords] = useState<BookingRecord[]>([]);
  const [err, setErr] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const handleCopy = (id: number, code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedId(id);
      message.success("6位核销码已成功复制到剪贴板！");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleQuery = async (e?: FormEvent) => {
    e?.preventDefault();
    const cleanPhone = phone.trim();
    if (!/^1[3-9]\d{9}$/.test(cleanPhone)) {
      setErr("请输入正确的 11 位中国大陆手机号码");
      return;
    }
    setErr("");
    setLoading(true);
    setSearched(true);
    try {
      const res: any = await portalApi.queryBookings(cleanPhone);
      setRecords(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      setErr(e.message || "未能查询到记录或服务暂忙，请稍后重试");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<
    string,
    { label: string; color: string; icon: React.ReactNode; desc: string }
  > = {
    PENDING: {
      label: "待审核 · 招生办跟进中",
      color: "#f59e0b",
      icon: <ClockCircleOutlined />,
      desc: "招生专员将在1个工作日内致电确认行程",
    },
    APPROVED: {
      label: "已确认 · 待到校核验",
      color: "#8B1D2C",
      icon: <SafetyCertificateOutlined />,
      desc: "已排班接待，到校时请向门卫出示核销码",
    },
    VERIFIED: {
      label: "已到校 · 已完成核销",
      color: "#10b981",
      icon: <CheckCircleOutlined />,
      desc: "已顺利到校完成面对面深度咨询与学情诊断",
    },
    CANCELLED: {
      label: "已取消",
      color: "#9ca3af",
      icon: <Close />,
      desc: "此预约记录已关闭",
    },
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#8B1D2C",
          borderRadius: 6,
          fontFamily: "inherit",
        },
      }}
    >
      <div
        className="booking-overlay"
        onClick={close}
        style={{
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
        }}
      >
        <div
          className="booking-modal modern-booking-modal"
          style={{
            width: "min(680px, 94vw)",
            maxWidth: 680,
            borderRadius: 12,
            padding: "clamp(24px, 3.5vw, 36px)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(229, 231, 235, 0.8)",
            background: "#ffffff",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="booking-close"
            onClick={close}
            aria-label="关闭"
            style={{ cursor: "pointer" }}
          >
            <Close />
          </button>

          <p
            className="kicker"
            style={{ color: "#8B1D2C", fontWeight: 600, letterSpacing: "0.08em" }}
          >
            SELF-SERVICE · 访校家长自助服务
          </p>
          <h3
            style={{
              margin: "4px 0 6px",
              fontSize: 22,
              fontFamily: "var(--font-serif, serif)",
              color: "#111827",
            }}
          >
            预约进度与通行凭证查询
          </h3>
          <p
            className="booking-sub"
            style={{
              margin: "0 0 18px",
              color: "#6b7280",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            输入提交预约时登记的家长手机号，即时获取 6 位到校核销码、专属接待老师及审核状态。
          </p>

          <form onSubmit={handleQuery} style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Input
              size="large"
              prefix={<PhoneOutlined style={{ color: "#8B1D2C" }} />}
              placeholder="请输入预约时填写的 11 位手机号码"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              allowClear
              maxLength={11}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={() => handleQuery()}
              icon={<SearchOutlined />}
              style={{
                background: "#8B1D2C",
                borderColor: "#8B1D2C",
                padding: "0 24px",
                fontWeight: 600,
              }}
            >
              快速查询
            </Button>
          </form>

          {err && (
            <Alert
              type="error"
              message={err}
              showIcon
              closable
              onClose={() => setErr("")}
              style={{ marginTop: 12 }}
            />
          )}

          <div
            style={{
              marginTop: 20,
              maxHeight: 380,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {loading && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin tip="正在从招生中心数据库同步预约记录..." />
              </div>
            )}

            {!loading && searched && records.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 20px",
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px dashed #e5e7eb",
                }}
              >
                <Empty
                  description={
                    <div>
                      <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
                        未查到与手机号【{phone}】关联的预约记录
                      </p>
                      <small style={{ color: "#9ca3af" }}>
                        请核对手机号是否有误，或在官网重新提交预约表单
                      </small>
                    </div>
                  }
                />
              </div>
            )}

            {!loading &&
              records.map((r) => {
                const st = statusMap[r.status] || {
                  label: r.status || "已受理",
                  color: "#8B1D2C",
                  icon: <SafetyCertificateOutlined />,
                  desc: "请妥善保管核销凭证",
                };
                return (
                  <div
                    key={r.appointmentId}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      background: "#ffffff",
                      marginBottom: 14,
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                      overflow: "hidden",
                    }}
                  >
                    {/* 卡片顶栏 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 16px",
                        background: "#fafafa",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "#6b7280",
                        }}
                      >
                        单号：<b>{r.appointmentNo}</b>
                      </span>
                      <Tag
                        color={st.color}
                        style={{
                          margin: 0,
                          borderRadius: 4,
                          fontWeight: 600,
                          padding: "2px 8px",
                        }}
                      >
                        {st.label}
                      </Tag>
                    </div>

                    {/* 卡片主体 */}
                    <div style={{ padding: "14px 18px" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px 16px",
                          fontSize: 13,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <span style={{ color: "#475569", fontWeight: 600, marginRight: 6 }}>
                            <UserOutlined /> 学生：
                          </span>
                          <strong style={{ color: "#0f172a" }}>{r.studentName}</strong>
                        </div>
                        <div>
                          <span style={{ color: "#475569", fontWeight: 600, marginRight: 6 }}>
                            校区：
                          </span>
                          <strong style={{ color: "#0f172a" }}>
                            {r.campusName || "汉外华襄（北门）"}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "#475569", fontWeight: 600, marginRight: 6 }}>
                            <CalendarOutlined /> 日期：
                          </span>
                          <strong style={{ color: "#8B1D2C" }}>{r.visitDate}</strong>
                        </div>
                        <div>
                          <span style={{ color: "#475569", fontWeight: 600, marginRight: 6 }}>
                            <ClockCircleOutlined /> 时段：
                          </span>
                          <strong style={{ color: "#0f172a" }}>{r.timeSlot}</strong>
                        </div>
                        {r.teacherName && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <span style={{ color: "#475569", fontWeight: 600, marginRight: 6 }}>
                              接待专员：
                            </span>
                            <strong style={{ color: "#0f172a" }}>{r.teacherName}</strong>
                          </div>
                        )}
                      </div>

                      {/* 核销码区域 */}
                      <div
                        style={{
                          background: "#fff7ed",
                          border: "1px dashed #fdba74",
                          borderRadius: 6,
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#c2410c",
                              display: "block",
                              marginBottom: 2,
                            }}
                          >
                            <SafetyCertificateOutlined style={{ marginRight: 4 }} />
                            到校入校专属 6 位核销防伪码
                          </span>
                          <span
                            style={{
                              color: "#8B1D2C",
                              fontSize: 24,
                              fontWeight: 700,
                              letterSpacing: "0.15em",
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                            }}
                          >
                            {r.checkInCode}
                          </span>
                        </div>
                        <Button
                          type="default"
                          icon={<CopyOutlined />}
                          onClick={() => handleCopy(r.appointmentId, r.checkInCode)}
                          style={{
                            borderColor: "#8B1D2C",
                            color: "#8B1D2C",
                            fontWeight: 500,
                          }}
                        >
                          {copiedId === r.appointmentId ? "已复制 ✓" : "复制核销码"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
