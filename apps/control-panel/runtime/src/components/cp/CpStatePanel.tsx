import type { ReactNode } from "react";
import { CpButton } from "./CpButton";
import { useCpTokens } from "./cpTokens";

/**
 * CpStatePanel — the low-level loading/empty/error state primitive: an
 * ARIA-live region with a title/description/code. `CpStateView` (in this
 * same directory) is the higher-level, `CpStateKind`-driven API screens
 * should actually call — it renders on top of this and picks role/title
 * copy/retry affordance from the state kind automatically. Use this
 * directly only when a screen needs a state panel shape `CpStateView`
 * doesn't cover.
 */
export function CpStatePanel({ role, title, description, code, children }: { readonly role: "status" | "alert"; readonly title: string; readonly description?: string; readonly code?: string; readonly children?: ReactNode }) {
  const { styles } = useCpTokens();
  return (
    <div
      style={{ ...styles.statePanel, ...(role === "alert" ? styles.statePanelAlert : {}) }}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
    >
      <strong style={styles.statePanelTitle}>{title}</strong>
      {description ? <span style={styles.statePanelDesc}>{description}</span> : null}
      {code ? <code style={styles.statePanelCode}>{code}</code> : null}
      {children}
    </div>
  );
}

export function CpRetryButton({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) {
  const { styles } = useCpTokens();
  return <CpButton onClick={onClick} style={styles.retryButton}>{children}</CpButton>;
}
