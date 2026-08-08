import type {
  FieldReadinessNextAction,
  FieldReadinessProblem,
  FieldReadinessProblemKind,
} from "./field-readiness.problem";

/**
 * Single presentation source for a governed field failure.
 *
 * Every surface (app-field, control-panel, app-partner, app-captain, app-client)
 * renders failures through this view model so one backend reason code produces
 * the same title, the same next action, and the same retry affordance
 * everywhere. Screens must not re-derive intent from the message text.
 */
export type FieldProblemAction = {
  readonly actionId: FieldReadinessNextAction;
  readonly label: string;
};

export type FieldProblemView = {
  readonly title: string;
  readonly description: string;
  readonly code: string;
  readonly correlationId: string | null;
  /** True only when re-issuing the identical request can succeed. */
  readonly retryable: boolean;
  readonly primaryAction: FieldProblemAction | null;
  readonly supportHint: string | null;
};

/**
 * Exhaustive record: adding a `FieldReadinessNextAction` without a label is a
 * compile error rather than a silently unlabeled button.
 */
const NEXT_ACTION_LABELS: Readonly<Record<FieldReadinessNextAction, string | null>> = {
  reauthenticate: "تسجيل الدخول مجددًا",
  refresh_scope: "تحديث التكليفات",
  complete_checklist: "استكمال قائمة التحقق",
  add_evidence: "إضافة الأدلة المطلوبة",
  resolve_escalation: "فتح التصعيد",
  refresh_record: "تحديث البيانات",
  recapture_location: "التقاط الموقع مجددًا",
  enable_location: "تفعيل إذن الموقع",
  move_into_geofence: "الاقتراب من موقع المتجر",
  recover_queue: "استعادة العمليات المحفوظة",
  correct_input: "مراجعة المدخلات",
  retry: "إعادة المحاولة",
  contact_support: "التواصل مع الدعم",
  none: null,
};

const KIND_TITLES: Readonly<Record<FieldReadinessProblemKind, string>> = {
  permission_denied: "الصلاحية غير متاحة",
  offline: "لا يوجد اتصال بالخدمة",
  not_found: "السجل غير متاح",
  validation: "بيانات غير مكتملة أو غير صالحة",
  blocked: "لا يمكن المتابعة الآن",
  conflict: "تغيّرت حالة العملية",
  already_complete: "العملية منفّذة مسبقًا",
  location: "تعذّر إثبات الموقع",
  internal: "خلل تشغيلي",
};

const SUPPORT_HINT_KINDS: ReadonlySet<FieldReadinessProblemKind> = new Set<FieldReadinessProblemKind>([
  "internal",
  "conflict",
  "permission_denied",
]);

export function buildFieldProblemView(problem: FieldReadinessProblem): FieldProblemView {
  const label = NEXT_ACTION_LABELS[problem.nextAction];
  const primaryAction: FieldProblemAction | null =
    label === null ? null : { actionId: problem.nextAction, label };

  return {
    title: KIND_TITLES[problem.kind],
    description: problem.message,
    code: problem.code,
    correlationId: problem.correlationId ?? null,
    retryable: problem.retryable,
    primaryAction,
    supportHint: SUPPORT_HINT_KINDS.has(problem.kind)
      ? "عند تكرار المشكلة زوّد الدعم برمز السبب ورقم المرجع أدناه."
      : null,
  };
}

/**
 * Convenience for surfaces that only need to know whether a bare retry button
 * is legitimate. A non-retryable problem must never offer a plain retry.
 */
export function fieldProblemAllowsRetry(problem: FieldReadinessProblem): boolean {
  return problem.retryable;
}
