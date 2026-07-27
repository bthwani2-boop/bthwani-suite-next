import type { ReactNode } from "react";
import { useCpTokens } from "./cpTokens";

export type CpKpiCardProps = { readonly label: string; readonly value: number | string };
export function CpKpiCard({ label, value }: CpKpiCardProps) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiValue}>{value}</span>
      <span style={styles.kpiLabel}>{label}</span>
    </div>
  );
}

export function CpKpiStrip({ children }: { readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <div style={styles.kpiStrip} role="region" aria-label="مؤشرات">{children}</div>;
}
