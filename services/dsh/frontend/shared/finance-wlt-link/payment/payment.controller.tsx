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
  readonly disabled?: boolean;
  readonly statusLabel?: string;
  readonly statusTone?: "success" | "action" | "info" | "warning" | "danger";
  readonly helperText?: string;
  readonly action?: { readonly label: string; readonly onPress: () => void };
};

function providerPaymentsEnabled(): boolean {
  const env = (globalThis as RuntimeGlobal).process?.env;
  return (
    env?.["EXPO_PUBLIC_DSH_PROVIDER_PAYMENTS_ENABLED"] === "true" ||
    env?.["NEXT_PUBLIC_DSH_PROVIDER_PAYMENTS_ENABLED"] === "true"
  );
}

export function useDshPaymentController() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cod");
  const providerEnabled = providerPaymentsEnabled();
  const paymentDecisionOptions = useMemo<readonly PaymentDecisionOption[]>(
    () => [
      {
        id: "cod",
        title: "عند الاستلام (نقدًا)",
        description: "يثبت DSH مبلغ checkout ثم يطلب من WLT إنشاء المرجع المالي.",
        statusLabel: paymentMethod === "cod" ? "محدد" : "متاح",
        statusTone: paymentMethod === "cod" ? "action" : "success",
      },
      {
        id: "wallet",
        title: "من رصيد المحفظة",
        description: "الدفع الكامل من الرصيد المالي المملوك لـ WLT عبر DSH.",
        disabled: true,
        statusLabel: "غير متاح",
        statusTone: "info",
        helperText: "محجوب حتى يعيد DSH أهلية ورصيداً موثوقين من WLT.",
      },
      {
        id: "mixed",
        title: "محفظة + عند الاستلام",
        description: "تقسيم الدفع عبر جلسة مالية ينشئها DSH في WLT.",
        disabled: true,
        statusLabel: "غير متاح",
        statusTone: "info",
        helperText: "محجوب حتى ينشر DSH توزيعاً مالياً قابلاً للمصالحة.",
      },
      {
        id: "official_wallet",
        title: "المحافظ الإلكترونية الرسمية",
        description: "DSH ينسق الطلب بينما يدير WLT المزود والتحصيل والمطابقة.",
        disabled: !providerEnabled,
        statusLabel: providerEnabled ? (paymentMethod === "official_wallet" ? "محدد" : "متاح") : "محجوب تشغيليًا",
        statusTone: providerEnabled ? (paymentMethod === "official_wallet" ? "action" : "success") : "warning",
        helperText: providerEnabled
          ? "لا تغلق التطبيق أو تكرر الدفع أثناء انتظار النتيجة الحاكمة."
          : "يفشل هذا الخيار مغلقاً حتى يعتمد تشغيل المزود ويُفعّل علم DSH الصريح.",
      },
    ],
    [paymentMethod, providerEnabled],
  );

  return {
    paymentMethod,
    setPaymentMethod,
    paymentDecisionOptions,
    providerPaymentsEnabled: providerEnabled,
  };
}
