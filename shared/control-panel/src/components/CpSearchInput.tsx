import type { CSSProperties } from "react";
import { useCpTokens } from "./cpTokens";

export type CpSearchInputProps = { readonly value: string; readonly onChange: (value: string) => void; readonly placeholder?: string; readonly style?: CSSProperties; readonly wide?: boolean; readonly "aria-label"?: string; };
export function CpSearchInput({ value, onChange, placeholder, style, wide = false, "aria-label": ariaLabel }: CpSearchInputProps) {
  const { styles } = useCpTokens();
  return <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...styles.searchInput, ...(wide ? styles.searchWide : {}), ...style }} aria-label={ariaLabel} />;
}
