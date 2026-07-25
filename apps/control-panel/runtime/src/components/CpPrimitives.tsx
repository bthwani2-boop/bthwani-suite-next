import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { useMemo, useState } from "react";
import { amountToArabicText, useI18n, useBThwaniAppearance, alpha } from "@bthwani/ui-kit";
import { getUiKitCommon } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

/**
 * Single source of truth for control-panel primitive styling — every value
 * below is derived from the shared BThwani appearance tokens (lightPremium /
 * darkGlass) so switching appearance mode recolors every screen that uses
 * these primitives without any screen-local styling. Do not re-hardcode
 * colors, shadows, or spacing here or at call sites — extend the token
 * mapping instead.
 */
type CpAppearanceTokens = ReturnType<typeof useBThwaniAppearance>["tokens"];
type CpAppearanceShadow = CpAppearanceTokens["shadowSoft"];

function shadowToBoxShadow(shadow: CpAppearanceShadow): string {
  const { shadowOffset, shadowRadius, shadowColor, shadowOpacity } = shadow;
  return `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${alpha(shadowColor, shadowOpacity)}`;
}

function useCpTokens() {
  const { tokens, mode } = useBThwaniAppearance();

  const styles = useMemo(() => {
    const cp = tokens.components.controlPanel;
    const input = tokens.components.inputs;

    const inputBase: CSSProperties = {
      minHeight: "2.75rem",
      padding: "0.5rem 0.75rem",
      border: `1px solid ${input.border}`,
      borderRadius: "0.75rem",
      background: input.background,
      color: tokens.textPrimary,
      fontSize: "0.875rem",
    };

    return WebStyleSheet.create({
      select: { ...inputBase, cursor: "pointer" },
      searchInput: { ...inputBase, cursor: "text" },
      searchWide: { minWidth: "14rem" },
      textInput: { ...inputBase, width: "100%", cursor: "text" },
      table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
      tableHeaderCell: {
        padding: "0.5rem 0.75rem",
        textAlign: "start",
        fontWeight: 600,
        background: cp.tableHeader,
        color: tokens.textPrimary,
        borderBottom: `2px solid ${tokens.borderStrong}`,
        whiteSpace: "nowrap",
      },
      tableCell: {
        padding: "0.5rem 0.75rem",
        background: cp.tableRow,
        color: tokens.textPrimary,
        borderBottom: `1px solid ${tokens.border}`,
        verticalAlign: "middle",
      },
      kpiCard: {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        minWidth: "9rem",
        padding: "0.875rem 1rem",
        border: `1px solid ${cp.kpiBorder}`,
        borderRadius: "0.875rem",
        background: cp.kpiSurface,
        boxShadow: shadowToBoxShadow(tokens.shadowSoft),
      },
      kpiValue: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1, color: tokens.textPrimary },
      kpiLabel: { fontSize: "0.75rem", opacity: 0.65, color: tokens.textMuted },
      kpiStrip: { display: "flex", gap: "1.5rem", padding: "0.75rem 0", flexWrap: "wrap" },
      pageHeader: { padding: "1rem 1rem 0" },
      pageHeaderTitle: { margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700, color: tokens.textPrimary },
      filterBar: {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        alignItems: "center",
        background: cp.filterSurface,
        borderRadius: "0.75rem",
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
        borderRadius: "0.875rem",
      },
      statePanelAlert: {
        background: cp.warningPanelSurface,
        border: `1px solid ${cp.warningPanelBorder}`,
      },
      statePanelTitle: { fontSize: "1.125rem", color: tokens.textPrimary },
      statePanelDesc: { fontSize: "0.875rem", opacity: 0.65, color: tokens.textMuted },
      statePanelCode: {
        fontSize: "0.75rem",
        opacity: 0.75,
        fontFamily: "monospace",
        wordBreak: "break-all",
        maxWidth: "32rem",
        color: tokens.textMuted,
      },
      retryButton: {
        marginTop: "0.75rem",
        padding: "0.375rem 1rem",
        border: `1px solid ${tokens.accent}`,
        borderRadius: "0.5rem",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.875rem",
        color: tokens.accent,
      },
      emptyTableMessage: { padding: "1.5rem 1rem", fontSize: "0.875rem", opacity: 0.65, color: tokens.textMuted },
      selectableTableRow: { cursor: "pointer", background: cp.tableRow },
      selectableTableRowHover: { background: cp.tableRowHover },
      selectableTableRowSelected: {
        background: cp.tableRowSelected,
        boxShadow: `inset 0 0 0 2px ${tokens.glassBorder}`,
      },
      inlineCode: { fontSize: "0.75rem", fontFamily: "monospace", color: tokens.textPrimary },
      mutedInline: { marginInlineStart: "0.375rem", opacity: 0.55, color: tokens.textMuted },
      detailPanel: { padding: "1rem", height: "100%", background: tokens.surface },
      detailPanelHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      },
      detailPanelTitle: { margin: 0, fontSize: "1rem", fontWeight: 600, color: tokens.textPrimary },
      detailPanelCloseButton: {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "1.25rem",
        lineHeight: 1,
        color: tokens.textMuted,
      },
      detailMessage: { opacity: 0.65, color: tokens.textMuted },
      detailErrorTitle: { marginBottom: "0.5rem", color: tokens.danger },
      detailErrorCode: {
        fontSize: "0.75rem",
        opacity: 0.7,
        fontFamily: "monospace",
        wordBreak: "break-all",
        color: tokens.textMuted,
      },
      descriptionList: { margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" },
      descriptionRow: { display: "flex", flexDirection: "column", gap: "0.125rem" },
      descriptionRowLabel: {
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        opacity: 0.55,
        color: tokens.textMuted,
      },
      descriptionRowValue: { margin: 0, fontSize: "0.875rem", color: tokens.textPrimary },
      externalLink: { wordBreak: "break-all", fontSize: "0.8rem", color: tokens.accent },
      amountDisplay: { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' },
    });
  }, [tokens]);

  return { tokens, mode, styles };
}

export type CpButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "danger";

export type CpButtonProps = {
  readonly type?: "button" | "submit" | "reset";
  readonly onClick?: () => void;
  readonly style?: CSSProperties;
  readonly disabled?: boolean;
  readonly variant?: CpButtonVariant;
  readonly "aria-label"?: string;
  readonly children: ReactNode;
};

export function CpButton({
  type = "button",
  onClick,
  style,
  disabled,
  variant = "secondary",
  "aria-label": ariaLabel,
  children,
}: CpButtonProps) {
  const { tokens } = useCpTokens();
  const state = disabled ? tokens.components.buttons[variant].disabled : tokens.components.buttons[variant].default;
  const buttonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
    padding: "0.5rem 1rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: state.backgroundColor,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: state.borderColor,
    color: state.textColor,
    boxShadow: state.shadow ? shadowToBoxShadow(state.shadow) : undefined,
    ...style,
  };
  return (
    <button type={type} onClick={onClick} style={buttonStyle} disabled={disabled} aria-label={ariaLabel}>
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
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
};

export function CpSelect({ value, onChange, options, style, disabled, "aria-label": ariaLabel }: CpSelectProps) {
  const { styles } = useCpTokens();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ ...styles.select, ...style }}
      aria-label={ariaLabel}
    >
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
  const { styles } = useCpTokens();
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
  const { styles } = useCpTokens();
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

export type CpTextAreaProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly rows?: number;
  readonly "aria-label"?: string;
};

export function CpTextArea({ value, onChange, placeholder, disabled, rows = 4, "aria-label": ariaLabel }: CpTextAreaProps) {
  const { styles } = useCpTokens();
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{ ...styles.textInput, resize: "vertical", fontFamily: "inherit" }}
      aria-label={ariaLabel}
    />
  );
}

export type CpTableProps = { readonly style?: CSSProperties; readonly "aria-label"?: string; readonly children: ReactNode };
export function CpTable({ style, "aria-label": ariaLabel, children }: CpTableProps) {
  const { styles } = useCpTokens();
  return <table style={{ ...styles.table, ...style }} aria-label={ariaLabel}>{children}</table>;
}

export type CpTableHeaderCellProps = { readonly scope?: "col" | "row"; readonly style?: CSSProperties; readonly children: ReactNode };
export function CpTableHeaderCell({ scope = "col", style, children }: CpTableHeaderCellProps) {
  const { styles } = useCpTokens();
  return <th scope={scope} style={{ ...styles.tableHeaderCell, ...style }}>{children}</th>;
}

export type CpTableCellProps = { readonly style?: CSSProperties; readonly children?: ReactNode };
export function CpTableCell({ style, children }: CpTableCellProps) {
  const { styles } = useCpTokens();
  return <td style={{ ...styles.tableCell, ...style }}>{children}</td>;
}

export type CpKpiCardProps = { readonly label: string; readonly value: number | string };
export function CpKpiCard({ label, value }: CpKpiCardProps) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiValue}>{value}</span>
      <span style={styles.kpiLabel}>{label}</span>
    </div>
  );
}

export function CpKpiStrip({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <div style={styles.kpiStrip} role="region" aria-label="مؤشرات">{children}</div>;
}

export function CpPageHeader({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.pageHeader}>
      <h1 style={styles.pageHeaderTitle}>{title}</h1>
      {children}
    </div>
  );
}

export function CpFilterBar({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <div style={styles.filterBar} role="search" aria-label={label}>{children}</div>;
}

export function CpStatePanel({ role, title, description, code, children }: { readonly role: "status" | "alert"; readonly title: string; readonly description?: string; readonly code?: string; readonly children?: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div
      style={{ ...styles.statePanel, ...(role === "alert" ? styles.statePanelAlert : {}) }}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
    >
      <strong style={styles.statePanelTitle}>{title}</strong>
      {description ? <span style={styles.statePanelDesc}>{description}</span> : null}
      {code ? <code style={styles.statePanelCode}>{code}</code> : null}
      {children}
    </div>
  );
}

export function CpRetryButton({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <CpButton onClick={onClick} style={styles.retryButton}>{children}</CpButton>;
}

export function CpEmptyTableMessage({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
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
  const { styles } = useCpTokens();
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-selected={selected || undefined}
      style={{
        ...styles.selectableTableRow,
        ...(hovered && !selected ? styles.selectableTableRowHover : {}),
        ...(selected ? styles.selectableTableRowSelected : {}),
      }}
    >
      {children}
    </tr>
  );
}

export function CpInlineCode({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <code style={styles.inlineCode}>{children}</code>;
}

export function CpMutedInline({ children, tight = false }: { readonly children: ReactNode; readonly tight?: boolean }) {
  const { styles } = useCpTokens();
  return <span style={tight ? { ...styles.mutedInline, marginInlineStart: 0 } : styles.mutedInline}>{children}</span>;
}

export function CpDetailPanel({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailPanelHeader}>
        <h2 style={styles.detailPanelTitle}>{title}</h2>
        <CpButton onClick={onClose} aria-label="إغلاق لوحة التفاصيل" variant="ghost" style={styles.detailPanelCloseButton}>×</CpButton>
      </div>
      {children}
    </div>
  );
}

export function CpDetailMessage({ role, children }: { readonly role: "status" | "alert"; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <div role={role} aria-live={role === "status" ? "polite" : undefined} style={styles.detailMessage}>{children}</div>;
}

export function CpDetailError({ message }: { readonly message: string }) {
  const { styles } = useCpTokens();
  return (
    <div role="alert">
      <div style={styles.detailErrorTitle}>تعذر تحميل التفاصيل.</div>
      <code style={styles.detailErrorCode}>{message}</code>
    </div>
  );
}

export function CpDescriptionList({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <dl style={styles.descriptionList}>{children}</dl>;
}

export function CpDescriptionRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.descriptionRow}>
      <dt style={styles.descriptionRowLabel}>{label}</dt>
      <dd style={styles.descriptionRowValue}>{children}</dd>
    </div>
  );
}

export function CpExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <a href={href} target="_blank" rel="noopener noreferrer" style={styles.externalLink}>{children}</a>;
}

/**
 * CpBadge — status/tone indicator driven by the shared appearance token
 * badge set. Replaces screen-local badge color hacks (e.g. string-concatenated
 * alpha hex) with a single token-driven implementation.
 */
export type CpBadgeTone = "neutral" | "brand" | "promo" | "premium" | "success" | "warning" | "danger" | "info";

export function CpBadge({ tone = "neutral", children }: { readonly tone?: CpBadgeTone; readonly children: ReactNode }) {
  const { tokens } = useCpTokens();
  const state = tokens.components.badges[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.125rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.6,
        backgroundColor: state.backgroundColor,
        border: `1px solid ${state.borderColor}`,
        color: state.textColor,
      }}
    >
      {children}
    </span>
  );
}

/**
 * CpTabs — token-driven tab strip. Replaces hand-rolled tab buttons across
 * dashboard/overview screens with a single implementation backed by the
 * shared chip tokens.
 */
export type CpTabItem = { readonly value: string; readonly label: string };

export function CpTabs({
  items,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  readonly items: readonly CpTabItem[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly "aria-label"?: string;
}) {
  const { tokens } = useCpTokens();
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {items.map((item) => {
        const selected = item.value === value;
        const chip = selected ? tokens.components.chips.selected : tokens.components.chips.default;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: chip.backgroundColor,
              border: `1px solid ${chip.borderColor}`,
              color: chip.textColor,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
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
  const { styles } = useCpTokens();
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
