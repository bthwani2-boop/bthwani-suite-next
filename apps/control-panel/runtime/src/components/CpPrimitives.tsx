import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { amountToArabicText, useI18n, colorRoles, alpha } from "@bthwani/ui-kit";
import { getUiKitCommon } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

export type CpButtonProps = {
  readonly type?: "button" | "submit" | "reset";
  readonly onClick?: () => void;
  readonly style?: CSSProperties;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
  readonly children: ReactNode;
};

export function CpButton({
  type = "button",
  onClick,
  style,
  disabled,
  "aria-label": ariaLabel,
  children,
}: CpButtonProps) {
  return (
    <button type={type} onClick={onClick} style={style} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export type CpSelectOption = { readonly value: string; readonly label: string };

export type CpSelectProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly CpSelectOption[];
  readonly style?: CSSProperties;
  readonly "aria-label"?: string;
};

export function CpSelect({ value, onChange, options, style, "aria-label": ariaLabel }: CpSelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...styles.select, ...style }} aria-label={ariaLabel}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export type CpSearchInputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
  readonly wide?: boolean;
  readonly "aria-label"?: string;
};

export function CpSearchInput({ value, onChange, placeholder, style, wide = false, "aria-label": ariaLabel }: CpSearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...styles.searchInput, ...(wide ? styles.searchWide : {}), ...style }}
      aria-label={ariaLabel}
    />
  );
}

export type CpTextInputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly type?: "text" | "password";
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
};

export function CpTextInput({ value, onChange, placeholder, type = "text", disabled, "aria-label": ariaLabel }: CpTextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={styles.textInput}
      aria-label={ariaLabel}
    />
  );
}

export type CpTableProps = { readonly style?: CSSProperties; readonly "aria-label"?: string; readonly children: ReactNode };
export function CpTable({ style, "aria-label": ariaLabel, children }: CpTableProps) {
  return <table style={{ ...styles.table, ...style }} aria-label={ariaLabel}>{children}</table>;
}

export type CpTableHeaderCellProps = { readonly scope?: "col" | "row"; readonly style?: CSSProperties; readonly children: ReactNode };
export function CpTableHeaderCell({ scope = "col", style, children }: CpTableHeaderCellProps) {
  return <th scope={scope} style={{ ...styles.tableHeaderCell, ...style }}>{children}</th>;
}

export type CpTableCellProps = { readonly style?: CSSProperties; readonly children?: ReactNode };
export function CpTableCell({ style, children }: CpTableCellProps) {
  return <td style={{ ...styles.tableCell, ...style }}>{children}</td>;
}

export type CpKpiCardProps = { readonly label: string; readonly value: number | string };
export function CpKpiCard({ label, value }: CpKpiCardProps) {
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiValue}>{value}</span>
      <span style={styles.kpiLabel}>{label}</span>
    </div>
  );
}

export function CpKpiStrip({ children }: { readonly children: ReactNode }) {
  return <div style={styles.kpiStrip} role="region" aria-label="مؤشرات">{children}</div>;
}

export function CpPageHeader({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <div style={styles.pageHeader}>
      <h1 style={styles.pageHeaderTitle}>{title}</h1>
      {children}
    </div>
  );
}

export function CpFilterBar({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <div style={styles.filterBar} role="search" aria-label={label}>{children}</div>;
}

export function CpStatePanel({ role, title, description, code, children }: { readonly role: "status" | "alert"; readonly title: string; readonly description?: string; readonly code?: string; readonly children?: ReactNode }) {
  return (
    <div style={styles.statePanel} role={role} aria-live={role === "status" ? "polite" : undefined}>
      <strong style={styles.statePanelTitle}>{title}</strong>
      {description ? <span style={styles.statePanelDesc}>{description}</span> : null}
      {code ? <code style={styles.statePanelCode}>{code}</code> : null}
      {children}
    </div>
  );
}

export function CpRetryButton({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) {
  return <CpButton onClick={onClick} style={styles.retryButton}>{children}</CpButton>;
}

export function CpEmptyTableMessage({ children }: { readonly children: ReactNode }) {
  return <div style={styles.emptyTableMessage}>{children}</div>;
}

export function CpSelectableTableRow({
  selected,
  onClick,
  onDoubleClick,
  children,
}: {
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly onDoubleClick?: MouseEventHandler<HTMLTableRowElement>;
  readonly children: ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-selected={selected || undefined}
      style={{
        ...styles.selectableTableRow,
        outline: selected ? "2px solid currentColor" : undefined,
      }}
    >
      {children}
    </tr>
  );
}

export function CpInlineCode({ children }: { readonly children: ReactNode }) {
  return <code style={styles.inlineCode}>{children}</code>;
}

export function CpMutedInline({ children }: { readonly children: ReactNode }) {
  return <span style={styles.mutedInline}>{children}</span>;
}

export function CpDetailPanel({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailPanelHeader}>
        <h2 style={styles.detailPanelTitle}>{title}</h2>
        <CpButton onClick={onClose} aria-label="إغلاق لوحة التفاصيل" style={styles.detailPanelCloseButton}>×</CpButton>
      </div>
      {children}
    </div>
  );
}

export function CpDetailMessage({ role, children }: { readonly role: "status" | "alert"; readonly children: ReactNode }) {
  return <div role={role} aria-live={role === "status" ? "polite" : undefined} style={styles.detailMessage}>{children}</div>;
}

export function CpDetailError({ message }: { readonly message: string }) {
  return (
    <div role="alert">
      <div style={styles.detailErrorTitle}>تعذر تحميل التفاصيل.</div>
      <code style={styles.detailErrorCode}>{message}</code>
    </div>
  );
}

export function CpDescriptionList({ children }: { readonly children: ReactNode }) {
  return <dl style={styles.descriptionList}>{children}</dl>;
}

export function CpDescriptionRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div style={styles.descriptionRow}>
      <dt style={styles.descriptionRowLabel}>{label}</dt>
      <dd style={styles.descriptionRowValue}>{children}</dd>
    </div>
  );
}

export function CpExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={styles.externalLink}>{children}</a>;
}

/**
 * CpAmountDisplay — renders a monetary amount using the shared ui-kit
 * `amountToArabicText` formatter. Ensures consistent amount display
 * across the control-panel, driven by the shared design system.
 */
export function CpAmountDisplay({
  amountMinorUnits,
  currencyCode = "SAR",
  locale = "ar",
}: {
  readonly amountMinorUnits: number;
  readonly currencyCode?: string;
  readonly locale?: "ar" | "en";
}) {
  const { t } = useI18n();
  const formatted = amountToArabicText(amountMinorUnits, t);
  return (
    <span
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={styles.amountDisplay}
      aria-label={`${amountMinorUnits / 100} ${currencyCode}`}
    >
      {formatted}
    </span>
  );
}

/**
 * CpCommonLabels — exposes the ui-kit i18n common labels for the given locale.
 * Ensures the control-panel uses the same shared label strings as the apps.
 */
export function getCpCommonLabels(locale: "ar" | "en" = "ar") {
  return getUiKitCommon(locale);
}

const inputBase: CSSProperties = {
  minHeight: "2.75rem",
  padding: "0.5rem 0.75rem",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: "0.75rem",
  background: "Canvas",
  fontSize: "0.875rem",
  cursor: "pointer",
};

const styles = WebStyleSheet.create({
  select: {
    ...inputBase,
  },
  searchInput: {
    ...inputBase,
  },
  searchWide: {
    minWidth: "14rem",
  },
  textInput: {
    ...inputBase,
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  tableHeaderCell: {
    padding: "0.5rem 0.75rem",
    textAlign: "start",
    fontWeight: 600,
    borderBottom: `2px solid ${alpha(colorRoles.shadowBase, 0.15)}`,
    whiteSpace: "nowrap",
  },
  tableCell: {
    padding: "0.5rem 0.75rem",
    borderBottom: `1px solid ${alpha(colorRoles.shadowBase, 0.08)}`,
    verticalAlign: "middle",
  },
  kpiCard: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: "9rem",
    padding: "0.875rem 1rem",
    border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
    borderRadius: "0.875rem",
    background: "Canvas",
    boxShadow: `0 0.5rem 1.5rem ${alpha(colorRoles.shadowBase, 0.05)}`,
  },
  kpiValue: {
    fontSize: "1.5rem",
    fontWeight: 700,
    lineHeight: 1,
  },
  kpiLabel: {
    fontSize: "0.75rem",
    opacity: 0.65,
  },
  kpiStrip: {
    display: "flex",
    gap: "1.5rem",
    padding: "0.75rem 0",
    flexWrap: "wrap",
  },
  pageHeader: {
    padding: "1rem 1rem 0",
  },
  pageHeaderTitle: {
    margin: "0 0 0.5rem",
    fontSize: "1.25rem",
    fontWeight: 700,
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    padding: "0.5rem 1rem",
    alignItems: "center",
  },
  statePanel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1rem",
    gap: "0.5rem",
    textAlign: "center",
    minHeight: "12rem",
  },
  statePanelTitle: {
    fontSize: "1.125rem",
  },
  statePanelDesc: {
    fontSize: "0.875rem",
    opacity: 0.65,
  },
  statePanelCode: {
    fontSize: "0.75rem",
    opacity: 0.75,
    fontFamily: "monospace",
    wordBreak: "break-all",
    maxWidth: "32rem",
  },
  retryButton: {
    marginTop: "0.75rem",
    padding: "0.375rem 1rem",
    border: "1px solid currentColor",
    borderRadius: "0.25rem",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  emptyTableMessage: {
    padding: "1.5rem 1rem",
    fontSize: "0.875rem",
    opacity: 0.65,
  },
  selectableTableRow: {
    cursor: "pointer",
  },
  inlineCode: {
    fontSize: "0.75rem",
    fontFamily: "monospace",
  },
  mutedInline: {
    marginInlineStart: "0.375rem",
    opacity: 0.55,
  },
  detailPanel: {
    padding: "1rem",
    height: "100%",
  },
  detailPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  detailPanelTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
  },
  detailPanelCloseButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1.25rem",
    lineHeight: 1,
  },
  detailMessage: {
    opacity: 0.65,
  },
  detailErrorTitle: {
    marginBottom: "0.5rem",
  },
  detailErrorCode: {
    fontSize: "0.75rem",
    opacity: 0.7,
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  descriptionList: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.625rem",
  },
  descriptionRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
  },
  descriptionRowLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    opacity: 0.55,
  },
  descriptionRowValue: {
    margin: 0,
    fontSize: "0.875rem",
  },
  externalLink: {
    wordBreak: "break-all",
    fontSize: "0.8rem",
  },
  amountDisplay: {
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum"',
  },
});
