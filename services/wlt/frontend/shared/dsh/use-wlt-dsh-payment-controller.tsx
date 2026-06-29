import { useState, useMemo } from "react";

export type PaymentMethodKey = "cod" | "wallet" | "mixed" | "official-wallets";

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
  readonly walletLinked: boolean;
  readonly linkWallet: () => void;
  readonly walletDisplayBalance: number;
  readonly rechargeWallet: () => void;
  readonly paymentDecisionOptions: readonly PaymentDecisionOption[];
};

// Presentation-only selector state for DSH checkout UI; financial mutation remains owned by WLT runtime APIs.
export function useWltDshPaymentController(grandTotal: number): WltDshPaymentController {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cod");
  const [walletLinked, setWalletLinked] = useState(true);
  const [walletDisplayBalance, setWalletDisplayBalance] = useState(15000);

  const linkWallet = () => setWalletLinked(true);
  const rechargeWallet = () => setWalletDisplayBalance((prev) => prev + 20000);

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
        disabled: !walletLinked || walletDisplayBalance < grandTotal,
        statusLabel:
          paymentMethod === "wallet"
            ? "محدد"
            : walletDisplayBalance >= grandTotal
            ? "جاهز"
            : "رصيد غير كافٍ",
        statusTone:
          paymentMethod === "wallet"
            ? "action"
            : walletDisplayBalance >= grandTotal
            ? "success"
            : "danger",
        amountRows: [
          { label: "رصيد المحفظة", value: `${walletDisplayBalance} د.ي`, tone: "brand" },
          { label: "المطلوب خصمه", value: `${grandTotal} د.ي`, tone: "brand" },
        ],
        helperText:
          walletDisplayBalance < grandTotal
            ? `تحتاج لشحن ${grandTotal - walletDisplayBalance} د.ي إضافية.`
            : undefined,
        action: !walletLinked
          ? { label: "ربط المحفظة", onPress: linkWallet }
          : walletDisplayBalance < grandTotal
          ? { label: "شحن الرصيد", onPress: rechargeWallet }
          : undefined,
      },
      {
        id: "mixed",
        title: "محفظة + عند الاستلام",
        description: "استخدم رصيد المحفظة المتاح وادفع المتبقي نقدًا.",
        disabled: !walletLinked || walletDisplayBalance <= 0 || walletDisplayBalance >= grandTotal,
        statusLabel:
          paymentMethod === "mixed"
            ? "محدد"
            : walletDisplayBalance > 0 && walletDisplayBalance < grandTotal
            ? "جاهز"
            : "غير متوفر",
        statusTone: paymentMethod === "mixed" ? "action" : "info",
        amountRows: [
          { label: "من المحفظة", value: `${Math.min(walletDisplayBalance, grandTotal)} د.ي`, tone: "brand" },
          { label: "عند الاستلام", value: `${Math.max(0, grandTotal - walletDisplayBalance)} د.ي`, tone: "brand" },
        ],
      },
      {
        id: "official-wallets",
        title: "المحافظ الإلكترونية الرسمية",
        description: "الدفع عبر كاش، الكريمي، جوالي أو المحافظ الأخرى.",
        statusLabel: "متاح",
        statusTone: "info",
        action: {
          label: "اختيار محفظة",
          onPress: () => {
            if (typeof alert !== "undefined") {
              alert("سيتم فتح بوابة الدفع الخارجية قريبًا.");
            }
          },
        },
      },
    ];
  }, [paymentMethod, walletLinked, walletDisplayBalance, grandTotal]);

  return {
    paymentMethod,
    setPaymentMethod,
    walletLinked,
    linkWallet,
    walletDisplayBalance,
    rechargeWallet,
    paymentDecisionOptions,
  };
}
