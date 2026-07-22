import type {
  WltPaymentSessionPresentation,
  WltPaymentSessionStatus,
} from "./wlt-dsh-payment-session.types";

const PAYMENT_STATE_COPY: Record<WltPaymentSessionStatus, WltPaymentSessionPresentation> = {
  reference_created: {
    label: "تم إنشاء مرجع الدفع",
    description: "أنشأ WLT مرجعًا ماليًا ولم يبدأ اتصال المزود بعد.",
    tone: "info",
    terminal: false,
    recoverable: true,
  },
  pending_provider: {
    label: "بانتظار مزود الدفع",
    description: "الجلسة بانتظار بدء المعالجة لدى المزود المالي.",
    tone: "warning",
    terminal: false,
    recoverable: true,
  },
  authorization_pending: {
    label: "جارٍ التحقق من الدفع",
    description: "أُرسلت عملية التفويض. لا تكرر الطلب؛ حدّث الحالة الحاكمة.",
    tone: "warning",
    terminal: false,
    recoverable: true,
  },
  authorized: {
    label: "تم تفويض المبلغ",
    description: "وافق المزود على المبلغ، ولم يُثبت التحصيل في الدفتر بعد.",
    tone: "action",
    terminal: false,
    recoverable: true,
  },
  capture_pending: {
    label: "جارٍ تثبيت التحصيل",
    description: "عملية التحصيل قيد التنفيذ. لا تعِد إرسالها عند بطء الشبكة.",
    tone: "warning",
    terminal: false,
    recoverable: true,
  },
  captured: {
    label: "تم الدفع والتحصيل",
    description: "أكد WLT التحصيل وربطه بالقيد المالي الحاكم.",
    tone: "success",
    terminal: true,
    recoverable: false,
  },
  cod_pending: {
    label: "الدفع عند الاستلام",
    description: "سيُسجل التحصيل النقدي عبر مسار عهدة COD المستقل.",
    tone: "info",
    terminal: false,
    recoverable: true,
  },
  cod_collected: {
    label: "تم استلام النقد",
    description: "سُجل التحصيل النقدي في عهدة التحصيل الحاكمة.",
    tone: "success",
    terminal: true,
    recoverable: false,
  },
  failed: {
    label: "فشل الدفع",
    description: "أكد المزود فشل العملية. يمكن العودة لاختيار وسيلة دفع أخرى.",
    tone: "danger",
    terminal: true,
    recoverable: true,
  },
  expired: {
    label: "انتهت جلسة الدفع",
    description: "أغلق WLT الجلسة دون تحصيل. أنشئ محاولة جديدة من رحلة checkout.",
    tone: "info",
    terminal: true,
    recoverable: true,
  },
  provider_result_unknown: {
    label: "نتيجة المزود غير محسومة",
    description: "قد تكون العملية نُفذت لدى المزود. لا تكرر الدفع؛ حدّث الحالة أو افتح المطابقة.",
    tone: "danger",
    terminal: false,
    recoverable: true,
  },
};

export function presentWltPaymentSessionStatus(
  status: WltPaymentSessionStatus,
): WltPaymentSessionPresentation {
  return PAYMENT_STATE_COPY[status];
}

export function isWltPaymentSessionBusy(status: WltPaymentSessionStatus): boolean {
  return status === "authorization_pending" || status === "capture_pending";
}

export function requiresWltPaymentReconciliation(status: WltPaymentSessionStatus): boolean {
  return status === "provider_result_unknown";
}
