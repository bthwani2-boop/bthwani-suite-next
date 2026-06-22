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
      style={style}
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
      style={style}
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
