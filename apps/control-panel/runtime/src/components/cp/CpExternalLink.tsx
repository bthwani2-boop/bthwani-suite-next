import type { ReactNode } from "react";
import { useCpTokens } from "./cpTokens";

export function CpExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <a href={href} target="_blank" rel="noopener noreferrer" style={styles.externalLink}>{children}</a>;
}
