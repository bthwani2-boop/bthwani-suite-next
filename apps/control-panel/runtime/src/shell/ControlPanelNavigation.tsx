"use client";

import { useState } from "react";
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

/* ── Default icons per section key ──────────────────────────── */
const SECTION_ICONS: Record<string, ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  operations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  ),
  partners: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  catalogs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  marketing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  finance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  support: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  administration: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  platform: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  hr: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

import type { CSSProperties } from "react";
import { colorRoles, alpha } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

function NavItem({
  item,
  isActive,
  onPress,
}: {
  item: ControlPanelNavigationItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const icon = item.icon ?? SECTION_ICONS[item.section];

  const dynamicButtonStyle: CSSProperties = {
    cursor: (item.disabled ?? false) ? "not-allowed" : "pointer",
    fontWeight: isActive ? 700 : 500,
    background: isActive
      ? `linear-gradient(135deg, ${alpha(colorRoles.brandStructure, 0.85)} 0%, ${alpha(colorRoles.brandStructure, 0.95)} 100%)`
      : hovered
      ? alpha(colorRoles.textInverse, 0.05)
      : "transparent",
    color: isActive
      ? colorRoles.textInverse
      : hovered
      ? alpha(colorRoles.textInverse, 0.8)
      : "var(--sidebar-text, rgb(168, 191, 223))",
    boxShadow: isActive
      ? `inset 0 0 0 1px ${alpha(colorRoles.textSecondary, 0.35)}, 0 0 12px ${alpha(colorRoles.textSecondary, 0.12)}`
      : "none",
    opacity: (item.disabled ?? false) ? 0.4 : 1,
  };

  return (
    <li style={styles.navItemLi}>
      <button
        type="button"
        disabled={item.disabled ?? false}
        aria-current={isActive ? "page" : undefined}
        aria-disabled={item.disabled ?? false}
        onClick={onPress}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...styles.navItemButton,
          ...dynamicButtonStyle,
        }}
      >
        {/* Active indicator bar (start side) */}
        {isActive && (
          <span aria-hidden="true" style={styles.activeIndicator} />
        )}

        {/* Icon */}
        {icon != null ? (
          <span
            aria-hidden="true"
            style={{
              ...styles.iconWrapper,
              color: isActive ? colorRoles.textSecondary : "inherit",
            }}
          >
            {icon}
          </span>
        ) : null}

        {/* Label */}
        <span style={styles.label}>{item.label}</span>

        {/* Badge */}
        {item.badge != null ? (
          <span style={styles.badge}>
            {item.badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function ControlPanelNavigation({
  items,
  activeSection,
  onSectionPress,
  header,
  footer,
  dir = "rtl",
}: ControlPanelNavigationProps) {
  return (
    <nav dir={dir} style={styles.nav} aria-label="قائمة لوحة التحكم">
      {/* Brand Header */}
      <div style={styles.brandHeader}>
        <div style={styles.brandLogoContainer}>
          {/* DSH Logo Mark */}
          <div style={styles.brandLogoMark}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
          </div>
          <div>
            <div style={styles.brandLogoText}>
              DSH
            </div>
            <div>
              <div style={styles.brandLogoSubtitle}>
                لوحة التحكم
              </div>
            </div>
          </div>
        </div>
      </div>

      {header != null ? <div style={styles.headerWrapper}>{header}</div> : null}

      {/* Nav Items */}
      <div style={styles.itemsWrapper}>
        <ul style={styles.itemsList}>
          {items.map((item) => (
            <NavItem
              key={item.section}
              item={item}
              isActive={activeSection === item.section}
              onPress={() => { onSectionPress?.(item.section); }}
            />
          ))}
        </ul>
      </div>

      {/* Footer */}
      {footer != null ? (
        <div style={styles.footerWrapper}>
          {footer}
        </div>
      ) : null}

      {/* Version badge */}
      <div
        style={{
          ...styles.versionBadge,
          borderTop: footer == null ? "1px solid var(--sidebar-border, rgb(26, 42, 74))" : undefined,
        }}
      >
        DSH Control Panel v2
      </div>
    </nav>
  );
}

const styles = WebStyleSheet.create({
  navItemLi: {
    marginBottom: "2px",
  },
  navItemButton: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: "0.75rem",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.625rem",
    border: "none",
    textAlign: "inherit",
    fontFamily: "var(--font-arabic)",
    fontSize: "0.9rem",
    transition: "all 0.18s var(--ease-smooth, ease)",
    outline: "none",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    insetInlineStart: 0,
    top: "20%",
    bottom: "20%",
    width: "3px",
    borderRadius: "0 2px 2px 0",
    background: "var(--dsh-blue, rgb(59, 123, 255))",
    boxShadow: "0 0 8px var(--dsh-blue, rgb(59, 123, 255))",
  },
  iconWrapper: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.18s ease",
  },
  label: {
    flex: 1,
  },
  badge: {
    flexShrink: 0,
    background: "var(--dsh-blue, rgb(59, 123, 255))",
    color: colorRoles.textInverse,
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.1rem 0.45rem",
    borderRadius: "999px",
    lineHeight: 1.4,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--sidebar-bg, rgb(13, 20, 37))",
  },
  brandHeader: {
    padding: "1.25rem 1rem 1rem",
    borderBottom: "1px solid var(--sidebar-border, rgb(26, 42, 74))",
    flexShrink: 0,
  },
  brandLogoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  brandLogoMark: {
    width: "2rem",
    height: "2rem",
    borderRadius: "0.5rem",
    background: "var(--grad-blue, linear-gradient(135deg, rgb(59, 123, 255), rgb(94, 151, 255)))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: `0 0 12px ${alpha(colorRoles.textSecondary, 0.4)}`,
  },
  brandLogoText: {
    fontSize: "1rem",
    fontWeight: 800,
    color: colorRoles.textInverse,
    letterSpacing: "0.02em",
    lineHeight: 1.1,
  },
  brandLogoSubtitle: {
    fontSize: "0.68rem",
    color: "var(--sidebar-text, rgb(168, 191, 223))",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  headerWrapper: {
    flexShrink: 0,
  },
  itemsWrapper: {
    flex: 1,
    overflowY: "auto",
    padding: "0.75rem 0.625rem",
    scrollbarWidth: "none",
  },
  itemsList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  footerWrapper: {
    flexShrink: 0,
    borderTop: "1px solid var(--sidebar-border, rgb(26, 42, 74))",
    padding: "0.75rem",
  },
  versionBadge: {
    padding: "0.75rem 1rem",
    fontSize: "0.68rem",
    color: alpha(colorRoles.textSecondary, 0.45),
    letterSpacing: "0.04em",
  },
});
