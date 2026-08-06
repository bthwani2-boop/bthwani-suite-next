import type { ReactNode } from "react";
import { CpRetryButton, CpStatePanel } from "./CpStatePanel";
export type CpStateKind = "loading" | "empty" | "error" | "offline" | "unauthenticated" | "forbidden" | "blocked";
export type CpStateViewProps = { readonly kind: CpStateKind; readonly title?: string; readonly description?: string; readonly code?: string; readonly onRetry?: () => void; readonly retryLabel?: string; readonly illustration?: ReactNode; };
const ALERT_KINDS = new Set<CpStateKind>(["error", "offline", "unauthenticated", "forbidden", "blocked"]);
const DEFAULT_COPY: Record<CpStateKind, { readonly title: string; readonly description?: string }> = {
  loading: { title: "جارٍ التحميل…" }, empty: { title: "لا توجد بيانات" }, error: { title: "تعذر تحميل البيانات" },
  offline: { title: "الخدمة غير متاحة حاليًا", description: "تحقق من الاتصال ثم أعد المحاولة." },
  unauthenticated: { title: "جلسة مصادق عليها مطلوبة", description: "سجّل الدخول للمتابعة." },
  forbidden: { title: "لا تملك صلاحية هذه المساحة" }, blocked: { title: "الإجراء محظور حاليًا" },
};
export function CpStateView({ kind, title, description, code, onRetry, retryLabel = "إعادة المحاولة", illustration }: CpStateViewProps) {
  const defaults = DEFAULT_COPY[kind]; const role = ALERT_KINDS.has(kind) ? "alert" : "status"; const canRetry = onRetry != null && kind !== "unauthenticated" && kind !== "forbidden"; const resolvedDescription = description ?? defaults.description;
  return <CpStatePanel role={role} title={title ?? defaults.title} {...(resolvedDescription !== undefined ? { description: resolvedDescription } : {})} {...(code !== undefined ? { code } : {})}>{illustration}{canRetry ? <CpRetryButton onClick={onRetry as () => void}>{retryLabel}</CpRetryButton> : null}</CpStatePanel>;
}
