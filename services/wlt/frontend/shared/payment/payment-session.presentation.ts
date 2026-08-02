import type {
  WltPaymentSessionPresentation,
  WltPaymentSessionStatus,
} from "./payment-session.types";

const COPY: Record<WltPaymentSessionStatus, WltPaymentSessionPresentation> = {
  reference_created: { label: "تم إنشاء مرجع الدفع", description: "أنشأ WLT المرجع المالي ولم يبدأ اتصال المزود.", tone: "info", terminal: false },
  pending_provider: { label: "بانتظار مزود الدفع", description: "الجلسة بانتظار بدء المعالجة لدى المزود.", tone: "warning", terminal: false },
  authorization_pending: { label: "جارٍ التحقق من الدفع", description: "لا تكرر الطلب؛ حدّث الحالة الحاكمة عبر DSH.", tone: "warning", terminal: false },
  authorized: { label: "تم تفويض المبلغ", description: "وافق المزود ولم يثبت التحصيل في الدفتر بعد.", tone: "action", terminal: false },
  capture_pending: { label: "جارٍ تثبيت التحصيل", description: "التحصيل قيد التنفيذ؛ لا تعِد إرساله.", tone: "warning", terminal: false },
  captured: { label: "تم الدفع والتحصيل", description: "أكد WLT التحصيل والقيد المالي.", tone: "success", terminal: true },
  cod_pending: { label: "الدفع عند الاستلام", description: "سيسجل التحصيل عبر مسار عهدة COD.", tone: "info", terminal: false },
  cod_collected: { label: "تم استلام النقد", description: "سجل WLT التحصيل النقدي.", tone: "success", terminal: true },
  failed: { label: "فشل الدفع", description: "أكد المزود فشل العملية.", tone: "danger", terminal: true },
  expired: { label: "انتهت جلسة الدفع", description: "أغلق WLT الجلسة دون تحصيل.", tone: "info", terminal: true },
  provider_result_unknown: { label: "نتيجة المزود غير محسومة", description: "لا تكرر الدفع؛ حدّث الحالة أو افتح المطابقة.", tone: "danger", terminal: false },
};

export function presentWltPaymentSessionStatus(status: WltPaymentSessionStatus): WltPaymentSessionPresentation {
  return COPY[status];
}

export function requiresWltPaymentReconciliation(status: WltPaymentSessionStatus): boolean {
  return status === "provider_result_unknown";
}
