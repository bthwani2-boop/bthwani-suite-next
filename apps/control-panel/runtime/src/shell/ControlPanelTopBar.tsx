import type { ReactNode } from "react";

export type ControlPanelTopBarProps = {
  readonly logo?: ReactNode;
  readonly title?: ReactNode;
  readonly serviceLabel?: ReactNode;
  readonly search?: ReactNode;
  readonly notifications?: ReactNode;
  readonly actions?: ReactNode;
  readonly userMenu?: ReactNode;
  readonly dir?: "ltr" | "rtl";
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
}: ControlPanelTopBarProps) {
  return (
    <header
      dir={dir}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        height: "var(--dsh-topbar-height, 3.5rem)",
        padding: "0 1.5rem",
        flexShrink: 0,
        background: "var(--dsh-topbar-bg, rgb(255,255,255))",
        borderBottom: "1px solid var(--dsh-topbar-border, rgb(226,232,243))",
        boxShadow: "0 1px 0 rgba(15,30,64,0.04)",
      }}
    >
      {/* Breadcrumb area */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
        {logo != null ? (
          <div style={{ flexShrink: 0 }}>{logo}</div>
        ) : null}

        {title != null ? (
          <span style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--dsh-text-secondary, rgb(90,106,133))",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            {title}
          </span>
        ) : null}

        {title != null && serviceLabel != null ? (
          <svg
            width="12" height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--dsh-text-muted, rgb(138,155,187))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, transform: dir === "rtl" ? "scaleX(-1)" : undefined }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        ) : null}

        {serviceLabel != null ? (
          <span style={{
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: "var(--dsh-text-primary, rgb(13,20,37))",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {serviceLabel}
          </span>
        ) : null}
      </div>

      {/* Search slot */}
      {search != null ? (
        <div style={{ flex: "0 1 18rem" }}>{search}</div>
      ) : null}

      {/* Right-side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
        {notifications != null ? <div>{notifications}</div> : null}
        {actions != null ? <div>{actions}</div> : null}

        {/* Default notification bell when no slot provided */}
        {notifications == null && (
          <button
            type="button"
            title="الإشعارات"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "2rem", height: "2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "transparent",
              color: "var(--dsh-text-muted)",
              cursor: "pointer",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--dsh-content-bg)";
              e.currentTarget.style.color = "var(--dsh-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--dsh-text-muted)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        )}

        {/* Default user avatar when no slot provided */}
        {userMenu != null ? (
          <div style={{ marginInlineStart: "0.25rem" }}>{userMenu}</div>
        ) : (
          <div style={{
            marginInlineStart: "0.375rem",
            width: "1.875rem",
            height: "1.875rem",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgb(59,123,255) 0%, rgb(94,82,246) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
            cursor: "pointer",
          }}>
            DSH
          </div>
        )}
      </div>
    </header>
  );
}
