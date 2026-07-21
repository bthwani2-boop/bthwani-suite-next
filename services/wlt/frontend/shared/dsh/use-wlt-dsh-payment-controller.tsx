import { useMemo, useState } from "react";

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
  readonly action?:
    | { readonly label: string; readonly onPress: () => void }
    | undefined;
};

export type WltDshPaymentController = {
  readonly paymentMethod: PaymentMethodKey;
  readonly setPaymentMethod: (method: PaymentMethodKey) => void;
  readonly paymentDecisionOptions: readonly PaymentDecisionOption[];
};

/**
 * Presentation selector for WLT-owned payment methods.
 *
 * This controller never calculates totals, balances, or wallet contributions.
 * DSH creates the checkout intent and WLT returns the authoritative payment
 * session/reference. Only COD currently has a complete runtime route.
 */
export function useWltDshPaymentController(): WltDshPaymentController {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cod");

  const paymentDecisionOptions = useMemo<readonly PaymentDecisionOption[]>(
    () => [
      {
        id: "cod",
        title: "عند الاستلام (نقدًا)",
        description:
          "يُثبت المبلغ النهائي في checkout ثم يفتح WLT مرجع الدفع عند الاستلام.",
        statusLabel: paymentMethod === "cod" ? "محدد" : "متاح",
        statusTone: paymentMethod === "cod" ? "action" : "success",
      },
      {
        id: "wallet",
        title: "من رصيد المحفظة",
        description: "الدفع الكامل من محفظة WLT.",
        disabled: true,
        statusLabel: "غير متاح",
        statusTone: "info",
        helperText:
          "محجوب حتى تتوفر أهلية ورصيد حقيقيان من WLT على نفس الرحلة.",
      },
      {
        id: "mixed",
        title: "محفظة + عند الاستلام",
        description: "تقسيم الدفع بين WLT والدفع عند الاستلام.",
        disabled: true,
        statusLabel: "غير متاح",
        statusTone: "info",
        helperText:
          "محجوب حتى يوفر WLT توزيعًا ماليًا معتمدًا وقابلًا للمصالحة.",
      },
      {
        id: "official_wallet",
        title: "المحافظ الإلكترونية الرسمية",
        description: "الدفع عبر مزود مالي رسمي من خلال WLT.",
        disabled: true,
        statusLabel: "غير متاح",
        statusTone: "info",
        helperText:
          "محجوب حتى يُفعّل مزود WLT الحقيقي وتكتمل أدلة الأمن والمالية والإصدار.",
      },
    ],
    [paymentMethod],
  );

  return {
    paymentMethod,
    setPaymentMethod,
    paymentDecisionOptions,
  };
}
