import { useMemo, useState } from "react";

type RuntimeGlobal = typeof globalThis & {
  readonly process?: {
    readonly env?: Readonly<Record<string, string | undefined>>;
  };
};

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
  readonly providerPaymentsEnabled: boolean;
};

function readProviderPaymentsEnabled(): boolean {
  const runtimeProcess = (globalThis as RuntimeGlobal).process;
  const env = runtimeProcess?.env;
  if (!env) return false;
  return (
    env["EXPO_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED"] === "true" ||
    env["NEXT_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED"] === "true"
  );
}

/**
 * Presentation selector for WLT-owned payment methods.
 *
 * This controller never calculates totals, balances, or wallet contributions.
 * DSH creates the checkout intent and WLT returns the authoritative payment
 * session/reference. Official provider payment remains fail-closed until a
 * runtime evidence flag is explicitly enabled for the surface.
 */
export function useWltDshPaymentController(): WltDshPaymentController {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cod");
  const providerPaymentsEnabled = readProviderPaymentsEnabled();

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
        disabled: !providerPaymentsEnabled,
        statusLabel: providerPaymentsEnabled
          ? paymentMethod === "official_wallet"
            ? "محدد"
            : "متاح"
          : "محجوب تشغيليًا",
        statusTone: providerPaymentsEnabled
          ? paymentMethod === "official_wallet"
            ? "action"
            : "success"
          : "warning",
        helperText: providerPaymentsEnabled
          ? "WLT يدير التفويض والتحصيل والمطابقة. لا تغلق التطبيق أو تكرر الدفع أثناء الانتظار."
          : "يفشل هذا الخيار مغلقًا حتى تُثبت بيئة المزود والويب هوك والمالية والأمن ثم يُفعّل علم التشغيل الصريح.",
      },
    ],
    [paymentMethod, providerPaymentsEnabled],
  );

  return {
    paymentMethod,
    setPaymentMethod,
    paymentDecisionOptions,
    providerPaymentsEnabled,
  };
}
