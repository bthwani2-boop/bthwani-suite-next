import { useState, useMemo } from "react";

export type PaymentMethodKey = "cod" | "wallet" | "mixed" | "official_wallet";

export type PaymentDecisionOption = {
  readonly id: PaymentMethodKey;
  readonly title: string;
  readonly description: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly statusLabel?: string;
  readonly statusTone?: "success" | "action" | "info" | "warning" | "danger";
  readonly helperText?: string | undefined;
  readonly amountRows?: readonly { readonly label: string; readonly value: string; readonly tone?: "brand" | "muted" }[] | undefined;
  readonly action?: { readonly label: string; readonly onPress: () => void } | undefined;
};

export type WltDshPaymentController = {
  readonly paymentMethod: PaymentMethodKey;
  readonly setPaymentMethod: (method: PaymentMethodKey) => void;
  readonly paymentDecisionOptions: readonly PaymentDecisionOption[];
};

// Presentation-only selector state for DSH checkout UI. COD is the only
// payment method with a real runtime path today (DSH creates a checkout
// intent, WLT opens an opaque payment-session reference). wallet, mixed,
// and official_wallet have no real WLT eligibility/balance/gateway endpoint
// yet, so they are shown as unavailable rather than backed by fake local
// state (no invented balance, no fake "link wallet"/"recharge" affordances,
// no alert()-only external-gateway placeholder). Flip this once a real WLT
// read-only eligibility endpoint exists for DSH to consume.
export function useWltDshPaymentController(grandTotal: number): WltDshPaymentController {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cod");

  const paymentDecisionOptions = useMemo<readonly PaymentDecisionOption[]>(() => {
    return [
      {
        id: "cod",
        title: "عند الاستلام (نقدًا)",
        description: "ادفع كامل المبلغ نقدًا عند استلام طلبك.",
        statusLabel: paymentMethod === "cod" ? "محدد" : "جاهز",
        statusTone: paymentMethod === "cod" ? "action" : "info",
        amountRows: [
          { label: "من المحفظة", value: "0 د.ي", tone: "muted" },
          { label: "عند الاستلام", value: `${grandTotal} د.ي`, tone: "brand" },
        ],
      },
      {
        id: "wallet",
        title: "من رصيد المحفظة",
        description: "ادفع كامل الطلب من رصيد محفظتك الداخلي.",
        disabled: true,
        statusLabel: "غير متاح حالياً",
        statusTone: "info",
        helperText: "سيُتاح الدفع من المحفظة عند ربط WLT بمصدر رصيد حقيقي.",
      },
      {
        id: "mixed",
        title: "محفظة + عند الاستلام",
        description: "استخدم رصيد المحفظة المتاح وادفع المتبقي نقدًا.",
        disabled: true,
        statusLabel: "غير متاح حالياً",
        statusTone: "info",
        helperText: "سيُتاح الدفع المختلط عند ربط WLT بمصدر رصيد حقيقي.",
      },
      {
        id: "official_wallet",
        title: "المحافظ الإلكترونية الرسمية",
        description: "الدفع عبر كاش، الكريمي، جوالي أو المحافظ الأخرى.",
        disabled: true,
        statusLabel: "غير متاح حالياً",
        statusTone: "info",
        helperText: "سيُتاح الدفع عبر المحافظ الرسمية عند ربط بوابة WLT الحقيقية.",
      },
    ];
  }, [paymentMethod, grandTotal]);

  return {
    paymentMethod,
    setPaymentMethod,
    paymentDecisionOptions,
  };
}
