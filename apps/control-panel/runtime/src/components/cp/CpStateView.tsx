import type { ReactNode } from "react";
import type { CpStateKind } from "@dsh-shared/_kernel/cp-state";
import { CpRetryButton, CpStatePanel } from "./CpStatePanel";

/**
 * CpStateView — the single loading/empty/error/offline/unauthenticated/
 * forbidden/blocked panel every control-panel screen should render from.
 *
 * This is the consolidation target named in the remediation plan (section
 * 1.3): it collapses `CpStatePanel` (57 call sites), ui-kit `StateView` used
 * inside the control panel (21 call sites), the per-screen 4-5-branch
 * ternary chains (e.g. `partners/PartnerListScreen.tsx`'s `stateView`), and
 * `describeFinanceBlockedReason` / `WorkforceErrorState` into one component
 * driven by `CpStateKind` (`shared/_kernel/cp-state.ts`).
 *
 * Default copy is provided per kind so most call sites only need to pass
 * `kind` (usually via `normalizeCpState(...)`) and, where retryable,
 * `onRetry`. Override `title`/`description` when a screen has a more
 * specific message than the generic default.
 *
 * Migrating an existing call site is intentionally small:
 *   controller.listState.kind === "error"
 *     ? <CpStatePanel role="alert" title="تعذر تحميل الشركاء" code={...}>
 *         <CpRetryButton onClick={controller.retry}>إعادة المحاولة</CpRetryButton>
 *       </CpStatePanel>
 *     : ...
 * becomes:
 *   <CpStateView kind={normalizeCpState(controller.listState.kind)} code={...} onRetry={controller.retry} />
 */
export type CpStateViewProps = {
  readonly kind: CpStateKind;
  readonly title?: string;
  readonly description?: string;
  readonly code?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly illustration?: ReactNode;
};

const ALERT_KINDS = new Set<CpStateKind>(["error", "offline", "unauthenticated", "forbidden", "blocked"]);

const DEFAULT_COPY: Record<CpStateKind, { readonly title: string; readonly description?: string }> = {
  loading: { title: "جارٍ التحميل…" },
  empty: { title: "لا توجد بيانات" },
  error: { title: "تعذر تحميل البيانات" },
  offline: { title: "الخدمة غير متاحة حاليًا", description: "تحقق من الاتصال ثم أعد المحاولة." },
  unauthenticated: { title: "جلسة مصادق عليها مطلوبة", description: "سجّل الدخول للمتابعة." },
  forbidden: { title: "لا تملك صلاحية هذه المساحة" },
  blocked: { title: "الإجراء محظور حاليًا" },
};

export function CpStateView({ kind, title, description, code, onRetry, retryLabel = "إعادة المحاولة", illustration }: CpStateViewProps) {
  const defaults = DEFAULT_COPY[kind];
  const role = ALERT_KINDS.has(kind) ? "alert" : "status";
  const canRetry = onRetry != null && kind !== "unauthenticated" && kind !== "forbidden";

  return (
    <CpStatePanel role={role} title={title ?? defaults.title} description={description ?? defaults.description} code={code}>
      {illustration}
      {canRetry ? <CpRetryButton onClick={onRetry as () => void}>{retryLabel}</CpRetryButton> : null}
    </CpStatePanel>
  );
}
