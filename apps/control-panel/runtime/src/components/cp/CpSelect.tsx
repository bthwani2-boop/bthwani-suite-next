import type { CSSProperties } from "react";
import { useCpTokens } from "./cpTokens";

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
