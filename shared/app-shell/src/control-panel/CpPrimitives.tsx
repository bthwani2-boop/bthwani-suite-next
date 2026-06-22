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
  padding: "0.375rem 0.5rem",
  border: "1px solid rgba(0, 0, 0, 0.2)",
  borderRadius: "0.25rem",
  background: "transparent",
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
  readonly "aria-label"?: string;
};

export function CpSearchInput({
  value,
  onChange,
  placeholder,
  style,
  "aria-label": ariaLabel,
}: CpSearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...CP_SELECT_DEFAULT_STYLE, ...style }}
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
    <table style={style} aria-label={ariaLabel}>
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
  minWidth: "7rem",
  padding: "0.5rem 0.75rem",
  border: "1px solid rgba(0, 0, 0, 0.12)",
  borderRadius: "0.375rem",
  background: "transparent",
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
