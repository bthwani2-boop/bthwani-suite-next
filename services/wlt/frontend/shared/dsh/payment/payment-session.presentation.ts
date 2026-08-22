import type {
  WltPaymentSessionCapabilities,
  WltPaymentSessionPresentation,
  WltPaymentSessionStatus,
} from "./payment-session.types";

const COPY: Record<WltPaymentSessionStatus, WltPaymentSessionPresentation> = {
  reference_created: { label: "تم إنشاء مرجع الدفع", description: "أنشأ WLT المرجع المالي ولم يبدأ اتصال المزود.", tone: "info" },
  pending_provider: { label: "بانتظار مزود الدفع", description: "الجلسة بانتظار بدء المعالجة لدى المزود.", tone: "warning" },
  authorization_pending: { label: "جارٍ التحقق من الدفع", description: "لا تكرر الطلب؛ حدّث الحالة الحاكمة عبر DSH.", tone: "warning" },
  authorized: { label: "تم تفويض المبلغ", description: "وافق المزود ولم يثبت التحصيل في الدفتر بعد.", tone: "action" },
  capture_pending: { label: "جارٍ تثبيت التحصيل", description: "التحصيل قيد التنفيذ؛ لا تعِد إرساله.", tone: "warning" },
  captured: { label: "تم الدفع والتحصيل", description: "أكد WLT التحصيل والقيد المالي.", tone: "success" },
  cod_pending: { label: "الدفع عند الاستلام", description: "ينتظر WLT إكمال مسار COD المحكوم.", tone: "info" },
  cod_finalized: { label: "تم إكمال COD", description: "أكد WLT إكمال التعرض الممول من الكابتن وقيده.", tone: "success" },
  failed: { label: "فشل الدفع", description: "أكد المزود فشل العملية.", tone: "danger" },
  expired: { label: "انتهت جلسة الدفع", description: "أغلق WLT الجلسة دون تحصيل.", tone: "info" },
  provider_result_unknown: { label: "نتيجة المزود غير محسومة", description: "لا تكرر الدفع؛ حدّث الحالة أو افتح المطابقة.", tone: "danger" },
};

export function presentWltPaymentSessionStatus(
  status: WltPaymentSessionStatus,
): WltPaymentSessionPresentation {
  return COPY[status];
}

export function isWltPaymentSessionBusy(
  capabilities: Pick<WltPaymentSessionCapabilities, "operationInProgress">,
): boolean {
  return capabilities.operationInProgress;
}

export function requiresWltPaymentReconciliation(
  capabilities: Pick<WltPaymentSessionCapabilities, "reconciliationRequired">,
): boolean {
  return capabilities.reconciliationRequired;
}
