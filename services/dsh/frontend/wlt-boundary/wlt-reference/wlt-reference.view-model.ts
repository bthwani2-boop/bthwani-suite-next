import type { WltDshReferenceState } from "./wlt-reference.states";
import type {
  WltPaymentStatusReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "../finance-boundary/wlt-dsh-boundary.types";

export type WltDshReferenceViewModel = {
  readonly paymentStatusLabel: string | null;
  readonly settlementStatusLabel: string | null;
  readonly refundStatusLabel: string | null;
  readonly isAvailable: boolean;
};

const PAYMENT_LABELS: Record<WltPaymentStatusReference, string> = {
  reference_created: "تم إنشاء المرجع",
  pending_provider: "بانتظار المزود",
  authorization_pending: "بانتظار التفويض",
  authorized: "مفوّض",
  capture_pending: "بانتظار التحصيل",
  captured: "مُحصَّل",
  cod_pending: "دفع عند الاستلام معلّق",
  cod_finalized: "دفع عند الاستلام مكتمل",
  failed: "فشل",
  expired: "منتهي الصلاحية",
  provider_result_unknown: "نتيجة المزود غير معروفة",
};

const SETTLEMENT_LABELS: Record<WltSettlementStatusReference, string> = {
  pending: "معلّق",
  processing: "قيد المعالجة",
  settled: "مُسوَّى",
  failed: "فشل",
  reversed: "معكوس",
};

const REFUND_LABELS: Record<WltRefundStatusReference, string> = {
  requested: "مطلوب",
  approved: "مقبول",
  processing: "قيد المعالجة",
  provider_unknown: "غير معروف لدى المزود",
  completed: "مكتمل",
  rejected: "مرفوض",
  reversed: "معكوس",
};

export function toWltDshReferenceViewModel(
  state: WltDshReferenceState,
): WltDshReferenceViewModel {
  if (state.kind !== "loaded") {
    return {
      paymentStatusLabel: null,
      settlementStatusLabel: null,
      refundStatusLabel: null,
      isAvailable: false,
    };
  }
  return {
    paymentStatusLabel:
      state.reference.paymentStatus !== null
        ? (PAYMENT_LABELS[state.reference.paymentStatus] ?? null)
        : null,
    settlementStatusLabel:
      state.reference.settlementStatus !== null
        ? (SETTLEMENT_LABELS[state.reference.settlementStatus] ?? null)
        : null,
    refundStatusLabel:
      state.reference.refundStatus !== null
        ? (REFUND_LABELS[state.reference.refundStatus] ?? null)
        : null,
    isAvailable: true,
  };
}
