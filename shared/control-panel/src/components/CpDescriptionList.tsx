import type { ReactNode } from "react";
import { useCpTokens } from "./cpTokens";

export function CpDescriptionList({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <dl style={styles.descriptionList}>{children}</dl>;
}

export function CpDescriptionRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.descriptionRow}>
      <dt style={styles.descriptionRowLabel}>{label}</dt>
      <dd style={styles.descriptionRowValue}>{children}</dd>
    </div>
  );
}
