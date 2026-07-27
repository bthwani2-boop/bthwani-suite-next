import type { ReactNode } from "react";
import { useCpTokens } from "./cpTokens";

export function CpInlineCode({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <code style={styles.inlineCode}>{children}</code>;
}

export function CpMutedInline({ children, tight = false }: { readonly children: ReactNode; readonly tight?: boolean }) {
  const { styles } = useCpTokens();
  return <span style={tight ? { ...styles.mutedInline, marginInlineStart: 0 } : styles.mutedInline}>{children}</span>;
}
