import type {
  GovernedNextAction,
  GovernedProblem,
  GovernedProblemKind,
} from "./governed-problem";

/**
 * Single presentation source for a governed field failure.
 *
 * Every surface (app-field, control-panel, app-partner, app-captain, app-client)
 * renders failures through this view model so one backend reason code produces
 * the same title, the same next action, and the same retry affordance
 * everywhere. Screens must not re-derive intent from the message text.
 */
export type GovernedProblemAction = {
  readonly actionId: GovernedNextAction;
  readonly label: string;
};

export type GovernedProblemView = {
  readonly title: string;
  readonly description: string;
  readonly code: string;
  readonly correlationId: string | null;
  /** True only when re-issuing the identical request can succeed. */
  readonly retryable: boolean;
  readonly primaryAction: GovernedProblemAction | null;
  readonly supportHint: string | null;
};

/**
 * Exhaustive record: adding a `GovernedNextAction` without a label is a
 * compile error rather than a silently unlabeled button.
 */
const NEXT_ACTION_LABELS: Readonly<Record<GovernedNextAction, string | null>> = {
  reauthenticate: "تسجيل الدخول مجددًا",
  refresh_scope: "تحديث التكليفات",
  complete_checklist: "استكمال قائمة التحقق",
  add_evidence: "إضافة الأدلة المطلوبة",
  resolve_escalation: "فتح التصعيد",
  complete_profile: "استكمال الملف المهني",
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

const KIND_TITLES: Readonly<Record<GovernedProblemKind, string>> = {
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

const SUPPORT_HINT_KINDS: ReadonlySet<GovernedProblemKind> = new Set<GovernedProblemKind>([
  "internal",
  "conflict",
  "permission_denied",
]);

export function buildGovernedProblemView(problem: GovernedProblem): GovernedProblemView {
  const label = NEXT_ACTION_LABELS[problem.nextAction];
  const primaryAction: GovernedProblemAction | null =
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
export function governedProblemAllowsRetry(problem: GovernedProblem): boolean {
  return problem.retryable;
}
