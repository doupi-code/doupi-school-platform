import { useState } from "react";
import {
  ConfigProvider,
  Steps,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Radio,
  Button,
  Tag,
  Alert,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/zh-cn";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleFilled,
  CopyOutlined,
  RightOutlined,
  LeftOutlined,
  SafetyCertificateOutlined,
  CompassOutlined,
  TrophyOutlined,
  BookOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { portalApi } from "@/api/portal";

dayjs.locale("zh-cn");

export interface BookingFormProps {
  submitLabel?: string;
  defaultType?: string;
  onSuccess?: (res: {
    appointmentNo: string;
    checkInCode: string;
    visitDate: string;
    studentName: string;
    type: string;
  }) => void;
  onQueryClick?: () => void;
}

export const BOOKING_TYPES = [
  "预约游园 / 访校参观",
  "名师一对一学情诊断",
  "班型咨询与学位预留",
  "高考复读志愿与选考评估",
];

export const TIME_SLOTS = [
  "上午 09:00 — 11:30",
  "下午 14:00 — 17:00",
  "晚间 18:30 — 20:00 (教师答疑段)",
];

const SCENARIOS = [
  {
    key: "预约游园 / 访校参观",
    icon: <EnvironmentOutlined style={{ fontSize: 22, color: "#8B1D2C" }} />,
    tag: "实地探校",
    title: "校园环境沉浸式考察",
    desc: "全面参观数字化教室、高标准学生公寓、营养餐厅及运动场馆",
  },
  {
    key: "名师一对一学情诊断",
    icon: <TrophyOutlined style={{ fontSize: 22, color: "#8B1D2C" }} />,
    tag: "精准提分",
    title: "学科首席名师 1v1 诊断",
    desc: "针对上届高考薄弱科目现场深度剖析，制定个性化增分规划",
  },
  {
    key: "班型咨询与学位预留",
    icon: <CompassOutlined style={{ fontSize: 22, color: "#8B1D2C" }} />,
    tag: "学位锁定",
    title: "拔尖创新班型咨询",
    desc: "了解清北冲刺班、卓越985班选拔机制，提前锁定紧缺班额",
  },
  {
    key: "高考复读志愿与选考评估",
    icon: <BookOutlined style={{ fontSize: 22, color: "#8B1D2C" }} />,
    tag: "赋分评估",
    title: "新高考志愿与选考评估",
    desc: "湖北新高考科目重新组合论证，赋分趋势研判与目标大学定位",
  },
];

const TIME_SLOT_OPTIONS = [
  {
    value: "上午 09:00 — 11:30",
    label: "上午时段 (09:00 — 11:30)",
    tip: "适宜随堂听课、察看早自习与晨练状态",
  },
  {
    value: "下午 14:00 — 17:00",
    label: "下午时段 (14:00 — 17:00)",
    tip: "适宜名师一对一深度学情诊断与面谈",
  },
  {
    value: "晚间 18:30 — 20:00 (教师答疑段)",
    label: "晚间时段 (18:30 — 20:00)",
    tip: "适宜观摩全静音晚自习与教师答疑现场",
  },
];

export function BookingForm({
  submitLabel = "立即提交并生成到校通行证",
  defaultType = "预约游园 / 访校参观",
  onSuccess,
  onQueryClick,
}: BookingFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // 成功态通行证数据
  const [passData, setPassData] = useState<{
    appointmentNo: string;
    checkInCode: string;
    visitDate: string;
    studentName: string;
    type: string;
    timeSlot: string;
    parentPhone: string;
  } | null>(null);

  // 一键快捷选日期（今天、周六、周日）
  const setQuickDate = (type: "saturday" | "sunday" | "tomorrow") => {
    let target = dayjs();
    if (type === "tomorrow") {
      target = target.add(1, "day");
    } else if (type === "saturday") {
      const day = target.day();
      const diff = (6 - day + 7) % 7 || 7;
      target = target.add(diff, "day");
    } else if (type === "sunday") {
      const day = target.day();
      const diff = (7 - day) % 7 || 7;
      target = target.add(diff, "day");
    }
    form.setFieldsValue({ visitDate: target });
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(["type", "student", "parent", "score"]);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        await form.validateFields(["visitDate", "timeSlot", "remark"]);
        setCurrentStep(2);
      }
    } catch {
      // 触发表单红字提示
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setErrorMsg("");

      const formattedDate = values.visitDate
        ? values.visitDate.format("YYYY-MM-DD")
        : dayjs().add(1, "day").format("YYYY-MM-DD");

      const res: any = await portalApi.submitBooking({
        student: values.student?.trim() || "学生",
        parent: values.parent?.trim() || "家长",
        phone: values.phone?.trim(),
        score: values.score ? Number(values.score) : undefined,
        type: `${values.type} (${values.timeSlot})`,
        preferredDate: formattedDate,
        remark: values.remark?.trim() || "官网向导预约",
      });

      const succ = {
        appointmentNo: res?.appointmentNo || `AP${Date.now()}`,
        checkInCode: res?.checkInCode || `${Math.floor(100000 + Math.random() * 900000)}`,
        visitDate: res?.visitDate || formattedDate,
        studentName: values.student?.trim() || "学生",
        type: values.type || defaultType,
        timeSlot: values.timeSlot,
        parentPhone: values.phone?.trim(),
      };

      setPassData(succ);
      onSuccess?.(succ);
    } catch (err: any) {
      setErrorMsg(err?.message || "网络繁忙，预约未能成功提交，请检查网络或致电校务热线");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      message.success("6位核销码已成功复制到剪贴板！");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 1. 成功态：入校核销通行证卡片 (Admission Pass 2.0)
  if (passData) {
    return (
      <div className="admission-pass-wrap" style={{ textAlign: "center", padding: "10px 0" }}>
        <CheckCircleFilled
          style={{
            fontSize: 52,
            color: "#10b981",
            marginBottom: 12,
            display: "inline-block",
          }}
        />
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontFamily: "var(--font-serif, serif)",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          预约已成功受理！
        </h3>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "#4b5563" }}>
          招生专员将在 1 个工作日内致电确认行程，请妥善保存下方到校电子通行证。
        </p>

        {/* 票根式电子通行证 */}
        <div
          className="admission-pass-card"
          style={{
            position: "relative",
            background: "#ffffff",
            border: "2px solid #8B1D2C",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 14px 36px rgba(139, 29, 44, 0.12)",
            textAlign: "left",
            marginBottom: 20,
          }}
        >
          {/* 通行证顶栏 */}
          <div
            style={{
              background: "#8B1D2C",
              color: "#ffffff",
              padding: "12px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#fecaca",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                HUAXIANG ADMISSION PASS
              </span>
              <strong style={{ fontSize: 14, letterSpacing: "0.05em", color: "#ffffff" }}>
                华襄高考复读学校 · 专属入校核销通行证
              </strong>
            </div>
            <span
              style={{
                background: "#f59e0b",
                color: "#ffffff",
                padding: "4px 12px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.06em",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              ● 待到校核验
            </span>
          </div>

          {/* 通行证核心信息区 */}
          <div style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 20px",
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              <div>
                <span style={{ color: "#475569", display: "block", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  预约事项
                </span>
                <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                  {passData.type}
                </span>
              </div>
              <div>
                <span style={{ color: "#475569", display: "block", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  预约单号
                </span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                  {passData.appointmentNo}
                </span>
              </div>
              <div>
                <span style={{ color: "#475569", display: "block", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  参访学生 / 电话
                </span>
                <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                  {passData.studentName} ({passData.parentPhone ? passData.parentPhone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "已登记"})
                </span>
              </div>
              <div>
                <span style={{ color: "#475569", display: "block", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  预约到校日期
                </span>
                <span style={{ fontWeight: 700, color: "#8B1D2C", fontSize: 15 }}>
                  {passData.visitDate}
                </span>
              </div>
            </div>

            {/* 核销防伪码大字展示区 */}
            <div
              style={{
                background: "#fff7ed",
                border: "1.5px dashed #fb923c",
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <SafetyCertificateOutlined style={{ color: "#8B1D2C", fontSize: 16 }} />
                  入校接待 6 位专属核销码
                </div>
                <div
                  style={{
                    color: "#8B1D2C",
                    fontSize: 34,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    lineHeight: 1.1,
                  }}
                >
                  {passData.checkInCode}
                </div>
              </div>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopyCode(passData.checkInCode)}
                style={{
                  background: "#8B1D2C",
                  borderColor: "#8B1D2C",
                  fontWeight: 600,
                  height: 40,
                  padding: "0 18px",
                }}
              >
                {copied ? "已复制 ✓" : "复制核销码"}
              </Button>
            </div>

            {/* 防伪装饰与指引 */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: "#334155",
                fontWeight: 500,
              }}
            >
              <span>接待地点：武汉市江夏区海淀外国语学校北门华襄教学区</span>
              <span style={{ letterSpacing: "2.5px", fontFamily: "monospace", fontWeight: 800, color: "#1e293b" }}>
                ||| || ||| |||| | ||| |||
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Button
            type="primary"
            style={{ background: "#8B1D2C", borderColor: "#8B1D2C" }}
            onClick={() => {
              setPassData(null);
              setCurrentStep(0);
              form.resetFields();
            }}
          >
            再预约一份
          </Button>
          {onQueryClick && (
            <Button onClick={onQueryClick}>
              查看我的预约记录
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 2. 表单向导页面
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
      <div className="modern-booking-container" style={{ padding: "4px 0" }}>
        {/* 分步指示器 */}
        <div style={{ marginBottom: 24 }}>
          <Steps
            current={currentStep}
            size="small"
            items={[
              { title: "意向与基础", icon: <UserOutlined /> },
              { title: "日期与时段", icon: <CalendarOutlined /> },
              { title: "联系与核验", icon: <PhoneOutlined /> },
            ]}
          />
        </div>

        {errorMsg && (
          <Alert
            type="error"
            message={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg("")}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: defaultType,
            timeSlot: TIME_SLOTS[0],
            visitDate: dayjs().add(1, "day"),
          }}
          requiredMark="optional"
        >
          {/* STEP 1: 意向场景与学生基础 */}
          <div style={{ display: currentStep === 0 ? "block" : "none" }}>
            <Form.Item
              name="type"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>咨询意向 / 预约事项</span>}
              rules={[{ required: true, message: "请选择咨询意向" }]}
            >
              <Radio.Group style={{ width: "100%" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {SCENARIOS.map((item) => (
                    <Radio.Button
                      key={item.key}
                      value={item.key}
                      style={{
                        height: "auto",
                        padding: "12px 14px",
                        lineHeight: 1.4,
                        borderRadius: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        border: "1px solid #e5e7eb",
                        whiteSpace: "normal",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {item.icon}
                          <strong style={{ fontSize: 13, color: "#1f2937" }}>{item.title}</strong>
                        </div>
                        <Tag color="#fef2f2" style={{ color: "#8B1D2C", border: "1px solid #fecaca", margin: 0, fontSize: 10 }}>
                          {item.tag}
                        </Tag>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: "#475569", textAlign: "left", lineHeight: 1.5 }}>
                        {item.desc}
                      </p>
                    </Radio.Button>
                  ))}
                </div>
              </Radio.Group>
            </Form.Item>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Form.Item
                name="student"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>学生姓名</span>}
                rules={[{ required: true, message: "请填写学生姓名" }]}
              >
                <Input placeholder="如：陈同学" prefix={<UserOutlined style={{ color: "#8B1D2C" }} />} />
              </Form.Item>

              <Form.Item
                name="parent"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>家长称谓</span>}
              >
                <Input placeholder="如：李女士 / 陈爸爸" />
              </Form.Item>
            </div>

            <Form.Item
              name="score"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>往届高考总分（选填）</span>}
              tooltip="用于针对性匹配分层冲刺班型及学科弱项诊断"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={200}
                max={750}
                placeholder="如：536 分（湖北新高考总分）"
                addonAfter="分"
              />
            </Form.Item>
          </div>

          {/* STEP 2: 到校日期与接待时段 */}
          <div style={{ display: currentStep === 1 ? "block" : "none" }}>
            <Form.Item
              name="visitDate"
              label={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>期望到校参访日期</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>快捷选择：</span>
                    <a onClick={() => setQuickDate("tomorrow")} style={{ fontSize: 12, color: "#8B1D2C", fontWeight: 700, textDecoration: "underline" }}>明天</a>
                    <span style={{ color: "#d1d5db" }}>|</span>
                    <a onClick={() => setQuickDate("saturday")} style={{ fontSize: 12, color: "#8B1D2C", fontWeight: 700, textDecoration: "underline" }}>周六</a>
                    <span style={{ color: "#d1d5db" }}>|</span>
                    <a onClick={() => setQuickDate("sunday")} style={{ fontSize: 12, color: "#8B1D2C", fontWeight: 700, textDecoration: "underline" }}>周日</a>
                  </div>
                </div>
              }
              rules={[{ required: true, message: "请选择期望到校日期" }]}
            >
              <DatePicker
                style={{ width: "100%", height: 40 }}
                placeholder="请选择到访日期"
                disabledDate={(current: Dayjs) => current && current < dayjs().startOf("day")}
              />
            </Form.Item>

            <Form.Item
              name="timeSlot"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>接待与诊断时段</span>}
              rules={[{ required: true, message: "请选择接待时段" }]}
            >
              <Radio.Group style={{ width: "100%" }}>
                <div style={{ display: "grid", gap: 8 }}>
                  {TIME_SLOT_OPTIONS.map((slot) => (
                    <Radio.Button
                      key={slot.value}
                      value={slot.value}
                      style={{
                        height: "auto",
                        padding: "10px 14px",
                        borderRadius: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ClockCircleOutlined style={{ color: "#8B1D2C" }} />
                        <span style={{ fontWeight: 600, color: "#1f2937", fontSize: 13 }}>{slot.label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{slot.tip}</span>
                    </Radio.Button>
                  ))}
                </div>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="remark"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>特别诉求 / 意向班型或学科（选填）</span>}
            >
              <Input.TextArea
                rows={3}
                placeholder="如：意向咨询物理+生物选科组合提分、寄宿双人间条件、名师晚自习个辅等..."
                maxLength={200}
                showCount
              />
            </Form.Item>
          </div>

          {/* STEP 3: 联系方式与确认预览 */}
          <div style={{ display: currentStep === 2 ? "block" : "none" }}>
            <Form.Item
              name="phone"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>家长手机号码（接收入校核销短信）</span>}
              rules={[
                { required: true, message: "请输入手机号码" },
                { pattern: /^1[3-9]\d{9}$/, message: "请输入有效的 11 位中国大陆手机号码" },
              ]}
              extra="手机号仅作为招生办核验登记及发送到校核销通行证之用，严格保护隐私。"
            >
              <Input
                size="large"
                prefix={<PhoneOutlined style={{ color: "#8B1D2C" }} />}
                placeholder="请输入 11 位手机号码"
                maxLength={11}
              />
            </Form.Item>

            {/* 信息复核清单 */}
            <div
              style={{
                background: "#fdf8f6",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 16,
                fontSize: 12,
                color: "#374151",
              }}
            >
              <div style={{ fontWeight: 600, color: "#8B1D2C", marginBottom: 6 }}>
                📋 预约信息确认核对：
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                <div>学生：<strong>{form.getFieldValue("student") || "未填"}</strong></div>
                <div>家长称谓：<strong>{form.getFieldValue("parent") || "家长"}</strong></div>
                <div style={{ gridColumn: "span 2" }}>
                  事项：<strong>{form.getFieldValue("type")}</strong>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  日期时段：<strong>
                    {form.getFieldValue("visitDate") ? form.getFieldValue("visitDate").format("YYYY-MM-DD") : "待定"} / {form.getFieldValue("timeSlot")}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 底部向导切换按钮 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
            {currentStep > 0 ? (
              <Button onClick={handlePrev} icon={<LeftOutlined />}>
                上一步
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 2 ? (
              <Button
                type="primary"
                onClick={handleNext}
                style={{ background: "#8B1D2C", borderColor: "#8B1D2C" }}
              >
                下一步 <RightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                loading={submitting}
                onClick={handleSubmit}
                style={{ background: "#8B1D2C", borderColor: "#8B1D2C", minWidth: 160 }}
              >
                {submitting ? "正在直连招生系统..." : submitLabel}
              </Button>
            )}
          </div>
        </Form>
      </div>
    </ConfigProvider>
  );
}
