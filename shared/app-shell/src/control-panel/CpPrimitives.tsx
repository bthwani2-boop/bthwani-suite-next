// Web primitive wrappers for control-panel surfaces.
// DSH/WLT control-panel components import these instead of raw HTML
// interactive elements, keeping raw HTML ownership inside shared/app-shell.
import type { CSSProperties, ReactNode } from "react";

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
    <button
      type={type}
      onClick={onClick}
      style={style}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export type CpSelectOption = {
  readonly value: string;
  readonly label: string;
};

export type CpSelectProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly CpSelectOption[];
  readonly style?: CSSProperties;
  readonly "aria-label"?: string;
};

const CP_SELECT_DEFAULT_STYLE: CSSProperties = {
  minHeight: "2.75rem",
  padding: "0.5rem 0.75rem",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: "0.75rem",
  background: "Canvas",
  fontSize: "0.875rem",
  cursor: "pointer",
};

export function CpSelect({
  value,
  onChange,
  options,
  style,
  "aria-label": ariaLabel,
}: CpSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...CP_SELECT_DEFAULT_STYLE, ...style }}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
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

export function CpSearchInput({
  value,
  onChange,
  placeholder,
  style,
  wide = false,
  "aria-label": ariaLabel,
}: CpSearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...CP_SELECT_DEFAULT_STYLE, ...(wide ? { minWidth: "14rem" } : {}), ...style }}
      aria-label={ariaLabel}
    />
  );
}

export type CpTableProps = {
  readonly style?: CSSProperties;
  readonly "aria-label"?: string;
  readonly children: ReactNode;
};

export function CpTable({ style, "aria-label": ariaLabel, children }: CpTableProps) {
  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", ...style }}
      aria-label={ariaLabel}
    >
      {children}
    </table>
  );
}

export type CpTableHeaderCellProps = {
  readonly scope?: "col" | "row";
  readonly style?: CSSProperties;
  readonly children: ReactNode;
};

const CP_TH_STYLE: CSSProperties = {
  padding: "0.5rem 0.75rem",
  textAlign: "start",
  fontWeight: 600,
  borderBottom: "2px solid rgba(0, 0, 0, 0.15)",
  whiteSpace: "nowrap",
};

export function CpTableHeaderCell({ scope = "col", style, children }: CpTableHeaderCellProps) {
  return (
    <th scope={scope} style={{ ...CP_TH_STYLE, ...style }}>
      {children}
    </th>
  );
}

export type CpTableCellProps = {
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
};

const CP_TD_STYLE: CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
  verticalAlign: "middle",
};

export function CpTableCell({ style, children }: CpTableCellProps) {
  return <td style={{ ...CP_TD_STYLE, ...style }}>{children}</td>;
}

export type CpKpiCardProps = {
  readonly label: string;
  readonly value: number | string;
};

const CP_KPI_CARD_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  minWidth: "9rem",
  padding: "0.875rem 1rem",
  border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
  borderRadius: "0.875rem",
  background: "Canvas",
  boxShadow: "0 0.5rem 1.5rem rgba(0, 0, 0, 0.05)",
};

const CP_KPI_VALUE_STYLE: CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  lineHeight: 1,
};

const CP_KPI_LABEL_STYLE: CSSProperties = {
  fontSize: "0.75rem",
  opacity: 0.65,
};

export function CpKpiCard({ label, value }: CpKpiCardProps) {
  return (
    <div style={CP_KPI_CARD_STYLE}>
      <span style={CP_KPI_VALUE_STYLE}>{value}</span>
      <span style={CP_KPI_LABEL_STYLE}>{label}</span>
    </div>
  );
}

export function CpPageHeader({
  title,
  children,
}: {
  readonly title: string;
  readonly children?: ReactNode;
}) {
  return (
    <div style={{ padding: "1rem 1rem 0" }}>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>
        {title}
      </h1>
      {children}
    </div>
  );
}

export function CpKpiStrip({ children }: { readonly children: ReactNode }) {
  return (
    <div
      style={{ display: "flex", gap: "1.5rem", padding: "0.75rem 0", flexWrap: "wrap" }}
      role="region"
      aria-label="مؤشرات"
    >
      {children}
    </div>
  );
}

export function CpFilterBar({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        alignItems: "center",
      }}
      role="search"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function CpStatePanel({
  role,
  title,
  description,
  code,
  children,
}: {
  readonly role: "status" | "alert";
  readonly title: string;
  readonly description?: string;
  readonly code?: string;
  readonly children?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        gap: "0.5rem",
        textAlign: "center",
        minHeight: "12rem",
      }}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
    >
      <strong style={{ fontSize: "1.125rem" }}>{title}</strong>
      {description ? <span style={{ fontSize: "0.875rem", opacity: 0.65 }}>{description}</span> : null}
      {code ? (
        <code
          style={{
            fontSize: "0.75rem",
            opacity: 0.75,
            fontFamily: "monospace",
            wordBreak: "break-all",
            maxWidth: "32rem",
          }}
        >
          {code}
        </code>
      ) : null}
      {children}
    </div>
  );
}

export function CpRetryButton({
  onClick,
  children,
}: {
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <CpButton
      onClick={onClick}
      style={{
        marginTop: "0.75rem",
        padding: "0.375rem 1rem",
        border: "1px solid currentColor",
        borderRadius: "0.25rem",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.875rem",
      }}
    >
      {children}
    </CpButton>
  );
}

export function CpEmptyTableMessage({ children }: { readonly children: ReactNode }) {
  return <div style={{ padding: "1.5rem 1rem", fontSize: "0.875rem", opacity: 0.65 }}>{children}</div>;
}

export function CpSelectableTableRow({
  selected,
  onClick,
  children,
}: {
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      aria-selected={selected || undefined}
      style={{ cursor: "pointer", outline: selected ? "2px solid currentColor" : undefined }}
    >
      {children}
    </tr>
  );
}

export function CpInlineCode({ children }: { readonly children: ReactNode }) {
  return <code style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{children}</code>;
}

export function CpMutedInline({ children }: { readonly children: ReactNode }) {
  return <span style={{ marginInlineStart: "0.375rem", opacity: 0.55 }}>{children}</span>;
}

export function CpDetailPanel({
  title,
  onClose,
  children,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div style={{ padding: "1rem", height: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
        <CpButton
          onClick={onClose}
          aria-label="إغلاق لوحة التفاصيل"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1 }}
        >
          ×
        </CpButton>
      </div>
      {children}
    </div>
  );
}

export function CpDetailMessage({
  role,
  children,
}: {
  readonly role: "status" | "alert";
  readonly children: ReactNode;
}) {
  return <div role={role} aria-live={role === "status" ? "polite" : undefined} style={{ opacity: 0.65 }}>{children}</div>;
}

export function CpDetailError({
  message,
}: {
  readonly message: string;
}) {
  return (
    <div role="alert">
      <div style={{ marginBottom: "0.5rem" }}>تعذر تحميل التفاصيل.</div>
      <code style={{ fontSize: "0.75rem", opacity: 0.7, fontFamily: "monospace", wordBreak: "break-all" }}>
        {message}
      </code>
    </div>
  );
}

export function CpDescriptionList({ children }: { readonly children: ReactNode }) {
  return <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>{children}</dl>;
}

export function CpDescriptionRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
      <dt
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          opacity: 0.55,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: "0.875rem" }}>{children}</dd>
    </div>
  );
}

export function CpExternalLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>
      {children}
    </a>
  );
}
