import type { CSSProperties, ReactNode } from "react";

// ── Button ────────────────────────────────────────────────────────────────────

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
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.5rem 1rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--dsh-card-border)",
        background: "var(--dsh-card-bg)",
        color: "var(--dsh-text-primary)",
        fontSize: "0.8125rem",
        fontWeight: 600,
        fontFamily: "var(--font-arabic)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s ease, box-shadow 0.15s ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Form inputs ───────────────────────────────────────────────────────────────

const CP_INPUT_STYLE: CSSProperties = {
  minHeight: "2.375rem",
  padding: "0.4rem 0.75rem",
  border: "1px solid var(--dsh-card-border)",
  borderRadius: "0.5rem",
  background: "var(--dsh-card-bg)",
  color: "var(--dsh-text-primary)",
  fontSize: "0.8125rem",
  fontFamily: "var(--font-arabic)",
  outline: "none",
};

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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...CP_INPUT_STYLE, cursor: "pointer", ...style }}
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
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...CP_INPUT_STYLE, ...(wide ? { minWidth: "14rem" } : {}), ...style }}
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
      style={{ ...CP_INPUT_STYLE, width: "100%", opacity: disabled ? 0.6 : 1 }}
      aria-label={ariaLabel}
    />
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

export type CpTableProps = { readonly style?: CSSProperties; readonly "aria-label"?: string; readonly children: ReactNode };
export function CpTable({ style, "aria-label": ariaLabel, children }: CpTableProps) {
  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", ...style }}
      aria-label={ariaLabel}
    >
      {children}
    </table>
  );
}

export type CpTableHeaderCellProps = { readonly scope?: "col" | "row"; readonly style?: CSSProperties; readonly children: ReactNode };
const CP_TH_STYLE: CSSProperties = {
  padding: "0.625rem 0.875rem",
  textAlign: "start",
  fontWeight: 600,
  fontSize: "0.75rem",
  color: "var(--dsh-text-muted)",
  borderBottom: "1px solid var(--dsh-card-border)",
  whiteSpace: "nowrap",
  background: "var(--dsh-content-bg)",
};
export function CpTableHeaderCell({ scope = "col", style, children }: CpTableHeaderCellProps) {
  return <th scope={scope} style={{ ...CP_TH_STYLE, ...style }}>{children}</th>;
}

export type CpTableCellProps = { readonly style?: CSSProperties; readonly children?: ReactNode };
const CP_TD_STYLE: CSSProperties = {
  padding: "0.75rem 0.875rem",
  borderBottom: "1px solid var(--dsh-content-bg)",
  verticalAlign: "middle",
  color: "var(--dsh-text-secondary)",
};
export function CpTableCell({ style, children }: CpTableCellProps) {
  return <td style={{ ...CP_TD_STYLE, ...style }}>{children}</td>;
}

// ── KPI ───────────────────────────────────────────────────────────────────────

export type CpKpiCardProps = { readonly label: string; readonly value: number | string };
export function CpKpiCard({ label, value }: CpKpiCardProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      minWidth: "9rem",
      padding: "1rem 1.25rem",
      border: "1px solid var(--dsh-card-border)",
      borderRadius: "0.875rem",
      background: "var(--dsh-card-bg)",
      boxShadow: "var(--dsh-card-shadow)",
    }}>
      <span style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1, color: "var(--dsh-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--dsh-text-muted)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

export function CpKpiStrip({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.75rem 0", flexWrap: "wrap" }} role="region" aria-label="مؤشرات">
      {children}
    </div>
  );
}

// ── Page structure ────────────────────────────────────────────────────────────

export function CpPageHeader({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
      <h1 style={{
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "var(--dsh-text-primary)",
        fontFamily: "var(--font-arabic)",
      }}>
        {title}
      </h1>
      {children != null ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function CpFilterBar({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", alignItems: "center" }}
      role="search"
      aria-label={label}
    >
      {children}
    </div>
  );
}

// ── State panels ──────────────────────────────────────────────────────────────

export function CpStatePanel({ role, title, description, code, children }: { readonly role: "status" | "alert"; readonly title: string; readonly description?: string; readonly code?: string; readonly children?: ReactNode }) {
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
      <strong style={{ fontSize: "1rem", color: "var(--dsh-text-primary)" }}>{title}</strong>
      {description != null ? <span style={{ fontSize: "0.875rem", color: "var(--dsh-text-muted)" }}>{description}</span> : null}
      {code != null ? <code style={{ fontSize: "0.75rem", color: "var(--dsh-text-muted)", fontFamily: "monospace", wordBreak: "break-all", maxWidth: "32rem" }}>{code}</code> : null}
      {children}
    </div>
  );
}

export function CpRetryButton({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <CpButton
      onClick={onClick}
      style={{
        marginTop: "0.75rem",
        background: "transparent",
        borderColor: "var(--dsh-card-border)",
      }}
    >
      {children}
    </CpButton>
  );
}

export function CpEmptyTableMessage({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ padding: "2rem 1rem", fontSize: "0.875rem", color: "var(--dsh-text-muted)", textAlign: "center" }}>
      {children}
    </div>
  );
}

export function CpSelectableTableRow({ selected, onClick, children }: { readonly selected: boolean; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <tr
      onClick={onClick}
      aria-selected={selected || undefined}
      style={{
        cursor: "pointer",
        background: selected ? "rgba(59,123,255,0.05)" : undefined,
        outline: selected ? "2px solid rgba(59,123,255,0.3)" : undefined,
        outlineOffset: "-1px",
      }}
    >
      {children}
    </tr>
  );
}

// ── Typography ────────────────────────────────────────────────────────────────

export function CpInlineCode({ children }: { readonly children: ReactNode }) {
  return (
    <code style={{
      fontSize: "0.75rem",
      fontFamily: "monospace",
      background: "var(--dsh-content-bg)",
      padding: "0.1rem 0.35rem",
      borderRadius: "0.25rem",
      color: "var(--dsh-text-secondary)",
    }}>
      {children}
    </code>
  );
}

export function CpMutedInline({ children }: { readonly children: ReactNode }) {
  return <span style={{ marginInlineStart: "0.375rem", color: "var(--dsh-text-muted)" }}>{children}</span>;
}

// ── Detail panel ──────────────────────────────────────────────────────────────

export function CpDetailPanel({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  return (
    <div style={{ padding: "1.25rem", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700, color: "var(--dsh-text-primary)" }}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق لوحة التفاصيل"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.25rem",
            lineHeight: 1,
            color: "var(--dsh-text-muted)",
            padding: "0.25rem",
          }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

export function CpDetailMessage({ role, children }: { readonly role: "status" | "alert"; readonly children: ReactNode }) {
  return (
    <div
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      style={{ color: "var(--dsh-text-muted)", fontSize: "0.875rem" }}
    >
      {children}
    </div>
  );
}

export function CpDetailError({ message }: { readonly message: string }) {
  return (
    <div role="alert">
      <div style={{ marginBottom: "0.5rem", color: "var(--dsh-text-primary)", fontWeight: 500 }}>تعذر تحميل التفاصيل.</div>
      <code style={{ fontSize: "0.75rem", color: "var(--dsh-text-muted)", fontFamily: "monospace", wordBreak: "break-all" }}>{message}</code>
    </div>
  );
}

// ── Description list ──────────────────────────────────────────────────────────

export function CpDescriptionList({ children }: { readonly children: ReactNode }) {
  return <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>{children}</dl>;
}

export function CpDescriptionRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <dt style={{
        fontSize: "0.68rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--dsh-text-muted)",
      }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: "0.875rem", color: "var(--dsh-text-primary)", fontWeight: 500 }}>{children}</dd>
    </div>
  );
}

export function CpExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ wordBreak: "break-all", fontSize: "0.8rem", color: "var(--dsh-sidebar-accent)" }}
    >
      {children}
    </a>
  );
}
