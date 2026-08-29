import type { ReactNode } from "react";
import { colorRoles, alpha } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

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
  /** Real DSH backend health signal. Omit to hide the status indicator entirely
   * rather than defaulting to a fake active/capability-wide claim. */
  readonly serviceStatus?: ControlPanelServiceStatus;
};

const SERVICE_STATUS_META: Record<ControlPanelServiceStatus, { readonly color: string; readonly label: string }> = {
  checking: { color: colorRoles.textMuted, label: "جارٍ فحص DSH" },
  healthy: { color: colorRoles.success, label: "DSH متصل" },
  unhealthy: { color: colorRoles.danger, label: "DSH غير متصل" },
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
    <header dir={dir} style={styles.header}>
      {/* Custom logo slot (if provided) */}
      {logo != null ? <div style={styles.logoWrapper}>{logo}</div> : null}

      {/* Brand wordmark (default) */}
      {logo == null && (
        <div style={styles.brandWrapper}>
          <div style={styles.logoIcon}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
          </div>
          <span style={styles.brandText}>
            DSH
          </span>
        </div>
      )}

      {/* Breadcrumb separator + title */}
      {title != null && (
        <>
          <span style={styles.separator}>
            —
          </span>
          <div style={styles.title}>
            {title}
          </div>
        </>
      )}

      {/* Service label / breadcrumb trail */}
      {serviceLabel != null && (
        <>
          <span style={styles.serviceSeparator}>
            /
          </span>
          <div style={styles.serviceLabel}>
            {serviceLabel}
          </div>
        </>
      )}

      {/* Real DSH backend health indicator — hidden entirely if no status was supplied */}
      {serviceStatus != null && (
        <div style={styles.statusWrapper}>
          <span
            style={{
              ...styles.statusIndicatorBase,
              background: SERVICE_STATUS_META[serviceStatus].color,
              animation: serviceStatus === "healthy" ? "dsh-pulse-dot 2s ease-in-out infinite" : undefined,
              boxShadow: `0 0 6px ${SERVICE_STATUS_META[serviceStatus].color}99`,
            }}
          />
          <span style={styles.statusText}>
            {SERVICE_STATUS_META[serviceStatus].label}
          </span>
        </div>
      )}

      {/* Search slot */}
      <div style={styles.searchWrapper}>{search}</div>

      {/* Custom actions slot */}
      {actions != null ? <div style={styles.actionsWrapper}>{actions}</div> : null}

      {/* Notifications slot — no default bell; a section that has not wired
          real notifications simply shows none rather than a fake badge. */}
      {notifications != null ? <div style={styles.notificationsWrapper}>{notifications}</div> : null}

      {/* User menu slot or default avatar */}
      {userMenu != null ? (
        <div style={styles.userMenuWrapper}>{userMenu}</div>
      ) : (
        <div style={styles.avatarDefault} title="المستخدم">
          N
        </div>
      )}
    </header>
  );
}

const styles = WebStyleSheet.create({
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    minHeight: "var(--cp-topbar-height, 3.75rem)",
    padding: "0 1.5rem",
    flexShrink: 0,
    borderBottom: "1px solid var(--cp-topbar-border)",
    background: "var(--cp-topbar-bg)",
    boxShadow: "0 1px 0 var(--cp-topbar-border)",
    zIndex: 30,
    position: "relative",
  },
  logoWrapper: {
    flexShrink: 0,
  },
  brandWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
  },
  logoIcon: {
    width: "1.75rem",
    height: "1.75rem",
    borderRadius: "0.375rem",
    background: "var(--cp-grad-blue)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 8px ${alpha(colorRoles.textSecondary, 0.35)}`,
  },
  brandText: {
    fontWeight: 800,
    fontSize: "1rem",
    background: "var(--cp-grad-blue)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "0.04em",
  },
  separator: {
    color: "var(--cp-text-muted)",
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  title: {
    flexShrink: 0,
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--cp-text-primary)",
  },
  serviceSeparator: {
    color: "var(--cp-text-muted)",
    fontSize: "0.8rem",
    flexShrink: 0,
  },
  serviceLabel: {
    flexShrink: 0,
    fontSize: "0.8rem",
    color: "var(--cp-text-secondary)",
  },
  statusWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    flexShrink: 0,
    paddingInlineStart: "0.25rem",
  },
  statusIndicatorBase: {
    width: "0.45rem",
    height: "0.45rem",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontSize: "0.72rem",
    color: "var(--cp-text-muted)",
    whiteSpace: "nowrap",
  },
  searchWrapper: {
    flex: 1,
    minWidth: 0,
  },
  actionsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
  },
  notificationsWrapper: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  userMenuWrapper: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarDefault: {
    width: "2rem",
    height: "2rem",
    borderRadius: "50%",
    background: "var(--cp-grad-blue)",
    color: colorRoles.textInverse,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.8rem",
    flexShrink: 0,
  },
});
