import { PhoneOutlined, SearchOutlined, CalendarOutlined } from "@ant-design/icons";
import { useBooking } from "@/components/booking";
import { Arrow } from "./Icons";

const PHONE = "027-81777887";

export function MobileBar({ onOpenQuery }: { onOpenQuery?: () => void }) {
  const b = useBooking();
  return (
    <>
      {b.modal}
      <div
        className="mobile-bar"
        style={{
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(10px)",
          background: "rgba(255, 255, 255, 0.95)",
          borderTop: "1px solid rgba(229, 231, 235, 0.8)",
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          gap: 8,
        }}
      >
        <a
          href={`tel:${PHONE}`}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            color: "#374151",
            padding: "8px 0",
            borderRadius: 6,
            background: "#f3f4f6",
          }}
        >
          <PhoneOutlined style={{ color: "#8B1D2C" }} /> 电话咨询
        </a>

        {onOpenQuery && (
          <button
            type="button"
            onClick={onOpenQuery}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "8px 0",
              background: "#ffffff",
              color: "#374151",
            }}
          >
            <SearchOutlined style={{ color: "#8B1D2C" }} /> 查询核销
          </button>
        )}

        <button
          type="button"
          onClick={b.open}
          style={{
            flex: 1.2,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            borderRadius: 6,
            padding: "8px 0",
            background: "#8B1D2C",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(139, 29, 44, 0.25)",
          }}
        >
          <CalendarOutlined /> 预约游园 <Arrow />
        </button>
      </div>
    </>
  );
}
