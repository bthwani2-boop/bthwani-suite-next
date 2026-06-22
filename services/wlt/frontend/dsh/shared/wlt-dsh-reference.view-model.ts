import type { WltDshReferenceState } from "./wlt-dsh-reference.states";
import type {
  WltPaymentStatusReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "./wlt-dsh-boundary.types";

export type WltDshReferenceViewModel = {
  readonly paymentStatusLabel: string | null;
  readonly settlementStatusLabel: string | null;
  readonly refundStatusLabel: string | null;
  readonly isAvailable: boolean;
};

const PAYMENT_LABELS: Record<WltPaymentStatusReference, string> = {
  pending: "معلّق",
  authorized: "مرخَّص",
  captured: "مُحصَّل",
  failed: "فشل",
  refunded: "مُسترجَع",
  partially_refunded: "مُسترجَع جزئياً",
};

const SETTLEMENT_LABELS: Record<WltSettlementStatusReference, string> = {
  pending: "معلّق",
  processing: "قيد المعالجة",
  settled: "مُسوَّى",
  failed: "فشل",
};

const REFUND_LABELS: Record<WltRefundStatusReference, string> = {
  none: "لا يوجد",
  requested: "مطلوب",
  approved: "مقبول",
  completed: "مكتمل",
  rejected: "مرفوض",
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
