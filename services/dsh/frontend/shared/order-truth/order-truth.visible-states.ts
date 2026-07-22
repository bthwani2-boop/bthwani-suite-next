export type OrderTruthVisibleStateKind =
  | "idle"
  | "loading"
  | "empty"
  | "success"
  | "partial"
  | "offline"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "error";

export type OrderTruthVisibleStatePolicy = {
  readonly title: string;
  readonly description: string;
  readonly tone: "neutral" | "success" | "warning" | "danger";
  readonly retryable: boolean;
  readonly announce: "polite" | "assertive";
};

export const ORDER_TRUTH_VISIBLE_STATE_POLICY: Readonly<
  Record<OrderTruthVisibleStateKind, OrderTruthVisibleStatePolicy>
> = {
  idle: {
    title: "جاهز لقراءة حقيقة الطلب",
    description: "لم تبدأ القراءة بعد.",
    tone: "neutral",
    retryable: false,
    announce: "polite",
  },
  loading: {
    title: "جاري تحميل حقيقة الطلب",
    description: "تتم القراءة من DSH مع نطاق الجلسة الحالية.",
    tone: "neutral",
    retryable: false,
    announce: "polite",
  },
  empty: {
    title: "لا توجد طلبات",
    description: "لا توجد حقيقة طلب مطابقة للنطاق أو التصفية الحالية.",
    tone: "neutral",
    retryable: true,
    announce: "polite",
  },
  success: {
    title: "تم تحميل حقيقة الطلب",
    description: "البيانات المعروضة صادرة من المصدر التشغيلي الموحد.",
    tone: "success",
    retryable: true,
    announce: "polite",
  },
  partial: {
    title: "عرض جزئي محفوظ",
    description: "تعذر التحديث، لذلك تظهر آخر قراءة ناجحة مع تنبيه واضح.",
    tone: "warning",
    retryable: true,
    announce: "assertive",
  },
  offline: {
    title: "لا يوجد اتصال بالخادم",
    description: "تحقق من الشبكة ثم أعد المحاولة بنفس الجلسة.",
    tone: "danger",
    retryable: true,
    announce: "assertive",
  },
  forbidden: {
    title: "غير مصرح لهذا السطح",
    description: "لا تُعرض بيانات بديلة أو محلية عند رفض الصلاحية.",
    tone: "warning",
    retryable: false,
    announce: "assertive",
  },
  not_found: {
    title: "الطلب غير متاح",
    description: "الطلب غير موجود أو خارج tenant أو actor scope الحالي.",
    tone: "warning",
    retryable: true,
    announce: "assertive",
  },
  conflict: {
    title: "تعارض في حالة الطلب",
    description: "حدّث الحقيقة من الخادم قبل تكرار الإجراء.",
    tone: "warning",
    retryable: true,
    announce: "assertive",
  },
  error: {
    title: "تعذر تحميل حقيقة الطلب",
    description: "حدث خطأ غير متوقع ولم يتم استخدام Mock أو حقيقة محلية.",
    tone: "danger",
    retryable: true,
    announce: "assertive",
  },
};

export function resolveOrderTruthVisibleState(
  kind: OrderTruthVisibleStateKind,
  message?: string,
): OrderTruthVisibleStatePolicy {
  const policy = ORDER_TRUTH_VISIBLE_STATE_POLICY[kind];
  return message?.trim() ? { ...policy, description: message.trim() } : policy;
}
