import { useRouteError, Link } from "react-router-dom";

export function RouteErrorBoundary() {
  const error: any = useRouteError();
  console.error("Route Error Boundary caught error:", error);

  return (
    <div style={{
      maxWidth: 600,
      margin: "80px auto",
      padding: "36px 32px",
      textAlign: "center",
      background: "var(--panel, #ffffff)",
      border: "1px solid var(--line, #e2e8f0)",
      borderRadius: 12,
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
      fontFamily: "inherit",
    }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#fee2e2",
        color: "#dc2626",
        fontSize: 28,
        marginBottom: 16,
      }}>
        !
      </div>
      <h2 style={{ fontSize: 20, margin: "0 0 10px", color: "var(--text, #1e293b)" }}>
        页面内容加载异常
      </h2>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
        系统在解析最新动态数据时遇到临时问题，已为您自动保留基础内容。
        您可以点击下方按钮刷新重试或返回首页。
      </p>
      {import.meta.env.DEV && error && (
        <details style={{ textAlign: "left", background: "#f8fafc", padding: 12, borderRadius: 6, margin: "16px 0", color: "#dc2626", fontSize: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>查看错误堆栈信息</summary>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {String(error?.message || error)}
            {"\n"}
            {String(error?.stack || "")}
          </pre>
        </details>
      )}
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "9px 20px",
            background: "var(--accent, #0284c7)",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          重新加载
        </button>
        <Link
          to="/"
          style={{
            padding: "9px 20px",
            background: "#f1f5f9",
            color: "#334155",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          返回官网首页
        </Link>
      </div>
    </div>
  );
}
