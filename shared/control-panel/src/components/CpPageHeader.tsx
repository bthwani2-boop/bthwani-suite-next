import type { ReactNode } from "react";
import { useCpTokens } from "./cpTokens";

export function CpPageHeader({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  const { styles } = useCpTokens();
  return <div style={styles.pageHeader}><h1 style={styles.pageHeaderTitle}>{title}</h1>{children}</div>;
}
