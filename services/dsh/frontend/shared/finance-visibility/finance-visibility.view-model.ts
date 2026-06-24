import type {
  DshPartnerFinanceSummary,
  WltPaymentStatusRef,
  WltSettlementStatusRef,
  WltRefundStatusRef,
} from "./finance-visibility.types";

export type FinanceStatusLabel = {
  readonly label: string;
  readonly badge: "success" | "warning" | "danger" | "neutral";
};

const PAYMENT_LABELS: Record<string, FinanceStatusLabel> = {
  pending: { label: "في انتظار الدفع", badge: "warning" },
  authorized: { label: "مرخّص", badge: "warning" },
  captured: { label: "تم التحصيل", badge: "success" },
  failed: { label: "فشل الدفع", badge: "danger" },
  refunded: { label: "مُسترجع", badge: "neutral" },
  cancelled: { label: "ملغي", badge: "neutral" },
};

const SETTLEMENT_LABELS: Record<string, FinanceStatusLabel> = {
  pending: { label: "في انتظار التسوية", badge: "warning" },
  processing: { label: "جارٍ التسوية", badge: "warning" },
  settled: { label: "تمّت التسوية", badge: "success" },
  failed: { label: "فشل التسوية", badge: "danger" },
  on_hold: { label: "موقوفة مؤقتاً", badge: "warning" },
};

export function buildFinanceStatusLabel(status: string, type: "payment" | "settlement"): FinanceStatusLabel {
  const map = type === "payment" ? PAYMENT_LABELS : SETTLEMENT_LABELS;
  return map[status] ?? { label: status, badge: "neutral" };
}

export function buildPartnerFinanceSummaryViewModel(
  payment: WltPaymentStatusRef,
  settlement: WltSettlementStatusRef,
  refund: WltRefundStatusRef | null
): DshPartnerFinanceSummary {
  return {
    orderId: payment.orderId,
    paymentStatus: payment.status,
    settlementStatus: settlement.status,
    refundStatus: refund?.status ?? null,
    walletStatus: null,
    updatedAt: payment.updatedAt,
  };
}
