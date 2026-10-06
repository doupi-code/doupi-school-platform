import { useEffect } from "react";
import { Close } from "@/components/common/Icons";
import { BookingForm } from "./BookingForm";

interface BookingModalProps {
  close: () => void;
  defaultType?: string;
  onSwitchToQuery?: () => void;
}

export function BookingModal({
  close,
  defaultType = "预约游园 / 访校参观",
  onSwitchToQuery,
}: BookingModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(680px, 94vw)",
          maxWidth: 680,
          borderRadius: 12,
          padding: "clamp(24px, 3.5vw, 36px)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(229, 231, 235, 0.8)",
          background: "#ffffff",
        }}
      >
        <button
          type="button"
          className="booking-close"
          onClick={close}
          aria-label="关闭"
          style={{
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Close />
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingRight: 32 }}>
          <div>
            <p className="kicker" style={{ color: "#8B1D2C", fontWeight: 600, letterSpacing: "0.08em" }}>
              ADMISSION & VISIT · 贵宾访校服务
            </p>
            <h3 style={{ margin: "4px 0 6px", fontSize: 22, fontFamily: "var(--font-serif, serif)", color: "#111827" }}>
              预约探校 / 名师学情深度诊断
            </h3>
          </div>
          {onSwitchToQuery && (
            <button
              type="button"
              onClick={onSwitchToQuery}
              style={{
                background: "transparent",
                border: "none",
                color: "#8B1D2C",
                fontSize: 12,
                cursor: "pointer",
                padding: "4px 0",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                fontWeight: 500,
              }}
            >
              查询已有预约进度 →
            </button>
          )}
        </div>

        <p className="booking-sub" style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
          留下基本意向与到访时间，专属学术导师将为您一对一定制探校路线，并实时生成防伪核销通行证。
        </p>

        <BookingForm
          defaultType={defaultType}
          onQueryClick={onSwitchToQuery}
        />
      </div>
    </div>
  );
}
