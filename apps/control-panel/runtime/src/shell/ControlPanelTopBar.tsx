import type { ReactNode } from "react";

export type ControlPanelServiceStatus = "checking" | "healthy" | "unhealthy";

export type ControlPanelTopBarProps = {
  readonly logo?: ReactNode;
  readonly title?: ReactNode;
  readonly serviceLabel?: ReactNode;
  readonly search?: ReactNode;
  readonly notifications?: ReactNode;
  readonly actions?: ReactNode;
  readonly userMenu?: ReactNode;
  readonly dir?: "ltr" | "rtl";
  /** Real backend health signal. Omit to hide the status indicator entirely
   * rather than defaulting to a fake "active" claim. */
  readonly serviceStatus?: ControlPanelServiceStatus;
};

const SERVICE_STATUS_META: Record<ControlPanelServiceStatus, { readonly color: string; readonly label: string }> = {
  checking: { color: "rgb(138, 155, 187)", label: "جارٍ التحقق" },
  healthy: { color: "rgb(0, 194, 168)", label: "متصل" },
  unhealthy: { color: "rgb(220, 38, 38)", label: "غير متصل" },
};

export function ControlPanelTopBar({
  logo,
  title,
  serviceLabel,
  search,
  notifications,
  actions,
  userMenu,
  dir = "rtl",
  serviceStatus,
}: ControlPanelTopBarProps) {
  return (
    <header
      dir={dir}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        minHeight: "var(--topbar-height, 3.75rem)",
        padding: "0 1.5rem",
        flexShrink: 0,
        borderBottom: "1px solid var(--topbar-border, rgb(226, 232, 243))",
        background: "var(--topbar-bg, rgb(255, 255, 255))",
        boxShadow: "0 1px 0 var(--topbar-border, rgb(226, 232, 243))",
        zIndex: 30,
        position: "relative",
      }}
    >
      {/* Custom logo slot (if provided) */}
      {logo != null ? <div style={{ flexShrink: 0 }}>{logo}</div> : null}

      {/* Brand wordmark (default) */}
      {logo == null && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <div
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "0.375rem",
              background: "var(--grad-blue, linear-gradient(135deg,rgb(59, 123, 255),rgb(94, 151, 255)))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 8px rgba(59,123,255,0.35)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              background: "var(--grad-blue, linear-gradient(135deg,rgb(59, 123, 255),rgb(94, 151, 255)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.04em",
            }}
          >
            DSH
          </span>
        </div>
      )}

      {/* Breadcrumb separator + title */}
      {title != null && (
        <>
          <span style={{ color: "var(--text-muted, rgb(138, 155, 187))", fontSize: "0.9rem", flexShrink: 0 }}>
            —
          </span>
          <div
            style={{
              flexShrink: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--text-primary, rgb(13, 20, 37))",
            }}
          >
            {title}
          </div>
        </>
      )}

      {/* Service label / breadcrumb trail */}
      {serviceLabel != null && (
        <>
          <span style={{ color: "var(--text-muted, rgb(138, 155, 187))", fontSize: "0.8rem", flexShrink: 0 }}>
            /
          </span>
          <div
            style={{
              flexShrink: 0,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--text-secondary, rgb(90, 106, 133))",
              background: "rgba(59,123,255,0.07)",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid rgba(59,123,255,0.15)",
            }}
          >
            {serviceLabel}
          </div>
        </>
      )}

      {/* Real backend health indicator — hidden entirely if no status was supplied */}
      {serviceStatus != null && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: SERVICE_STATUS_META[serviceStatus].color,
              display: "inline-block",
              animation: serviceStatus === "healthy" ? "dsh-pulse-dot 2s ease-in-out infinite" : undefined,
              boxShadow: `0 0 6px ${SERVICE_STATUS_META[serviceStatus].color}99`,
            }}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted, rgb(138, 155, 187))", fontWeight: 500 }}>
            {SERVICE_STATUS_META[serviceStatus].label}
          </span>
        </div>
      )}

      {/* Search slot */}
      <div style={{ flex: 1, minWidth: 0 }}>{search}</div>

      {/* Custom actions slot */}
      {actions != null ? <div style={{ flexShrink: 0 }}>{actions}</div> : null}

      {/* Notifications slot — no default bell; a section that has not wired
          real notifications simply shows none rather than a fake badge. */}
      {notifications != null ? <div style={{ flexShrink: 0 }}>{notifications}</div> : null}

      {/* User menu slot or default avatar */}
      {userMenu != null ? (
        <div style={{ flexShrink: 0 }}>{userMenu}</div>
      ) : (
        <div
          style={{
            flexShrink: 0,
            width: "2.25rem",
            height: "2.25rem",
            borderRadius: "50%",
            background: "var(--grad-blue, linear-gradient(135deg,rgb(59, 123, 255),rgb(94, 151, 255)))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "rgb(255, 255, 255)",
            cursor: "pointer",
            boxShadow: "0 0 0 2px rgba(59,123,255,0.2)",
            letterSpacing: "0.02em",
          }}
          title="المستخدم"
        >
          N
        </div>
      )}
    </header>
  );
}

