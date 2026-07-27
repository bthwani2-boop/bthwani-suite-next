import type { ReactNode } from "react";
import { useCpTokens } from "./cpTokens";

export function CpFilterBar({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <div style={styles.filterBar} role="search" aria-label={label}>{children}</div>;
}
