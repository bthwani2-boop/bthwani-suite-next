import type { PartnerOnboardingFailure, PartnerOnboardingRuntimeState } from "./partner-onboarding.runtime";

export type PartnerOnboardingVisibleState = {
  readonly kind: PartnerOnboardingRuntimeState;
  readonly title: string;
  readonly description: string;
  readonly tone: "neutral" | "info" | "warning" | "danger" | "success";
  readonly action: "none" | "retry" | "reload" | "complete_requirements" | "sign_in";
  readonly actionLabel: string;
  readonly blocksMutation: boolean;
};

const VISIBLE_STATES: Readonly<Record<PartnerOnboardingRuntimeState, Omit<PartnerOnboardingVisibleState, "kind">>> = {
  idle: {
    title: "ملف تأهيل الشريك",
    description: "ابدأ أو استأنف ملف التأهيل من المصدر التشغيلي.",
    tone: "neutral",
    action: "none",
    actionLabel: "",
    blocksMutation: false,
  },
  loading: {
    title: "جارٍ تحميل ملف الشريك",
    description: "يتم جلب أحدث حالة معتمدة من DSH.",
    tone: "info",
    action: "none",
    actionLabel: "",
    blocksMutation: true,
  },
  empty: {
    title: "لا يوجد ملف تأهيل بعد",
    description: "أنشئ مسودة شريك مملوكة للممثل الحالي من المصدر التشغيلي قبل متابعة التأهيل.",
    tone: "neutral",
    action: "none",
    actionLabel: "",
    blocksMutation: false,
  },
  ready: {
    title: "ملف الشريك جاهز",
    description: "الحالة المعروضة مطابقة لآخر قراءة مؤكدة من DSH.",
    tone: "success",
    action: "none",
    actionLabel: "",
    blocksMutation: false,
  },
  saving: {
    title: "جارٍ حفظ المسودة",
    description: "لا تغادر حتى تكتمل قراءة الحالة بعد الكتابة.",
    tone: "info",
    action: "none",
    actionLabel: "",
    blocksMutation: true,
  },
  submitting: {
    title: "جارٍ إرسال الملف للمراجعة",
    description: "يتم تثبيت المسودة والأدلة ثم التحقق من الحالة الملتزم بها.",
    tone: "info",
    action: "none",
    actionLabel: "",
    blocksMutation: true,
  },
  offline: {
    title: "لا يوجد اتصال بالخدمة",
    description: "احتفظ بالمدخلات الحالية وأعد المحاولة عند عودة الاتصال. لا تُعرض البيانات المحلية كحقيقة تشغيلية.",
    tone: "warning",
    action: "retry",
    actionLabel: "إعادة المحاولة",
    blocksMutation: true,
  },
  forbidden: {
    title: "غير مصرح بهذا الملف",
    description: "لا يملك الحساب الحالي نطاق الوصول المطلوب لقراءة أو تعديل ملف الشريك.",
    tone: "danger",
    action: "sign_in",
    actionLabel: "التحقق من الحساب",
    blocksMutation: true,
  },
  conflict: {
    title: "تغير الملف من سطح آخر",
    description: "أعد تحميل أحدث نسخة قبل متابعة التعديل حتى لا تُستبدل تغييرات ملتزم بها.",
    tone: "warning",
    action: "reload",
    actionLabel: "تحميل أحدث حالة",
    blocksMutation: true,
  },
  readiness_blocked: {
    title: "متطلبات التأهيل غير مكتملة",
    description: "راجع قائمة النواقص وأكمل الهوية والمتجر والأدلة ووجهة الصرف قبل الانتقال.",
    tone: "warning",
    action: "complete_requirements",
    actionLabel: "عرض النواقص",
    blocksMutation: true,
  },
  wlt_unavailable: {
    title: "خدمة وجهة الصرف غير متاحة",
    description: "لم تُحفظ بيانات مالية خام في DSH. أعد إرسال العملية بنفس هوية المحاولة عند عودة WLT.",
    tone: "warning",
    action: "retry",
    actionLabel: "إعادة المحاولة",
    blocksMutation: true,
  },
  partial: {
    title: "الحالة التشغيلية متاحة جزئيًا",
    description: "تمت قراءة حقيقة DSH، لكن بعض الإسقاطات التابعة غير متاحة. أعد التحميل قبل اتخاذ قرار نهائي.",
    tone: "warning",
    action: "reload",
    actionLabel: "تحديث الحالة",
    blocksMutation: true,
  },
  error: {
    title: "تعذر إكمال تأهيل الشريك",
    description: "حدث خطأ غير متوقع. أعد المحاولة، ثم ارفع رقم الارتباط للدعم إذا استمر الخطأ.",
    tone: "danger",
    action: "retry",
    actionLabel: "إعادة المحاولة",
    blocksMutation: true,
  },
};

export function resolvePartnerOnboardingVisibleState(
  kind: PartnerOnboardingRuntimeState,
  message?: string | null,
): PartnerOnboardingVisibleState {
  const state = VISIBLE_STATES[kind];
  return {
    kind,
    ...state,
    description: message?.trim() || state.description,
  };
}

export function resolvePartnerOnboardingFailureState(
  failure: PartnerOnboardingFailure,
): PartnerOnboardingVisibleState {
  return resolvePartnerOnboardingVisibleState(failure.state, failure.message);
}

export const PARTNER_ONBOARDING_VISIBLE_STATE_KINDS = Object.freeze(
  Object.keys(VISIBLE_STATES) as PartnerOnboardingRuntimeState[],
);
