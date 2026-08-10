import type { ReactNode } from "react";
import { CpButton } from "./CpButton";
import { useCpTokens } from "./cpTokens";

export function CpStatePanel({ role, title, description, code, children }: { readonly role: "status" | "alert"; readonly title: string; readonly description?: string; readonly code?: string; readonly children?: ReactNode }) {
  const { styles } = useCpTokens();
  return <div style={{ ...styles.statePanel, ...(role === "alert" ? styles.statePanelAlert : {}) }} role={role} aria-live={role === "status" ? "polite" : undefined}><strong style={styles.statePanelTitle}>{title}</strong>{description ? <span style={styles.statePanelDesc}>{description}</span> : null}{code ? <code style={styles.statePanelCode}>{code}</code> : null}{children}</div>;
}
export function CpRetryButton({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) { const { styles } = useCpTokens(); return <CpButton onClick={onClick} style={styles.retryButton}>{children}</CpButton>; }
