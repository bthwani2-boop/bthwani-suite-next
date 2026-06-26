import type { ReactNode } from "react";

export type ControlPanelNavigationItem = {
  readonly section: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly badge?: ReactNode;
  readonly disabled?: boolean;
};

export type ControlPanelNavigationProps = {
  readonly items: ReadonlyArray<ControlPanelNavigationItem>;
  readonly activeSection?: string;
  readonly onSectionPress?: (section: string) => void;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function ControlPanelNavigation({
  items,
  activeSection,
  onSectionPress,
  header,
  footer,
  dir = "rtl",
}: ControlPanelNavigationProps) {
  return (
    <nav
      dir={dir}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
      aria-label="قائمة لوحة التحكم"
    >
      {/* Brand */}
      <div style={{
        padding: "1.25rem 1.125rem 1rem",
        borderBottom: "1px solid var(--dsh-sidebar-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{
            width: "2rem", height: "2rem", borderRadius: "0.5rem",
            background: "linear-gradient(135deg, rgb(59,123,255) 0%, rgb(94,82,246) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "rgb(255,255,255)", lineHeight: 1.2 }}>DSH</div>
            <div style={{ fontSize: "0.65rem", color: "var(--dsh-sidebar-text)", marginTop: "0.1rem", letterSpacing: "0.02em" }}>لوحة التحكم الإدارية</div>
          </div>
        </div>
        {header != null ? <div style={{ marginTop: "0.75rem" }}>{header}</div> : null}
      </div>

      {/* Nav items */}
      <ul style={{ flex: 1, padding: "0.625rem 0.625rem", overflowY: "auto" }}>
        {items.map((item) => {
          const isActive = activeSection === item.section;
          return (
            <li key={item.section} style={{ marginBottom: "0.2rem" }}>
              <button
                type="button"
                disabled={item.disabled ?? false}
                aria-current={isActive ? "page" : undefined}
                onClick={() => { onSectionPress?.(item.section); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: "0.625rem",
                  padding: "0.6rem 0.875rem",
                  borderRadius: "0.625rem",
                  border: "none",
                  background: isActive
                    ? "var(--dsh-sidebar-bg-active)"
                    : "transparent",
                  color: isActive
                    ? "var(--dsh-sidebar-text-active)"
                    : "var(--dsh-sidebar-text)",
                  cursor: (item.disabled ?? false) ? "not-allowed" : "pointer",
                  textAlign: "inherit",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-arabic)",
                  transition: "background 0.15s ease, color 0.15s ease",
                  position: "relative",
                  opacity: item.disabled ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--dsh-sidebar-bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "3px",
                    height: "55%",
                    background: "var(--dsh-sidebar-accent)",
                    borderRadius: "2px 0 0 2px",
                  }} />
                )}

                {/* Icon */}
                {item.icon != null ? (
                  <span style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    opacity: isActive ? 1 : 0.65,
                    color: isActive ? "var(--dsh-sidebar-accent)" : "inherit",
                    transition: "opacity 0.15s ease",
                  }}>
                    {item.icon}
                  </span>
                ) : null}

                <span style={{ flex: 1 }}>{item.label}</span>

                {item.badge != null ? (
                  <span style={{ flexShrink: 0 }}>{item.badge}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      {footer != null ? (
        <div style={{
          flexShrink: 0,
          padding: "0.75rem 0.875rem",
          borderTop: "1px solid var(--dsh-sidebar-border)",
        }}>
          {footer}
        </div>
      ) : (
        /* Default version badge */
        <div style={{
          flexShrink: 0,
          padding: "0.875rem 1.125rem",
          borderTop: "1px solid var(--dsh-sidebar-border)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}>
          <div style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "50%",
            background: "rgba(59,123,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(94,151,255)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--dsh-sidebar-text)", fontWeight: 500 }}>النظام نشط</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(160,185,220,0.45)", marginTop: "0.05rem" }}>DSH v2 — SLICE-002</div>
          </div>
        </div>
      )}
    </nav>
  );
}
