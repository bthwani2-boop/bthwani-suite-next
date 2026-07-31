import type { ReactNode } from "react";
import { CpButton } from "./CpButton";
import { useCpTokens } from "./cpTokens";

export function CpDetailPanel({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailPanelHeader}>
        <h2 style={styles.detailPanelTitle}>{title}</h2>
        <CpButton onClick={onClose} aria-label="إغلاق لوحة التفاصيل" variant="ghost" style={styles.detailPanelCloseButton}>×</CpButton>
      </div>
      {children}
    </div>
  );
}

export function CpDetailMessage({ role, children }: { readonly role: "status" | "alert"; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <div role={role} aria-live={role === "status" ? "polite" : undefined} style={styles.detailMessage}>{children}</div>;
}

export function CpDetailError({ message }: { readonly message: string }) {
  const { styles } = useCpTokens();
  return (
    <div role="alert">
      <div style={styles.detailErrorTitle}>تعذر تحميل التفاصيل.</div>
      <code style={styles.detailErrorCode}>{message}</code>
    </div>
  );
}
