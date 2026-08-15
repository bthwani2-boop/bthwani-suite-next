import { useEffect, useMemo, useState } from "react";
import { fetchOwnRepresentativeWallet, type RepresentativeWallet } from "../actor-wallet/actor-wallet.api";
import { formatWltMoney } from "../finance/wlt-money";

type RuntimeGlobal = typeof globalThis & {
  readonly process?: {
    readonly env?: Readonly<Record<string, string | undefined>>;
  };
};

declare const __DEV__: boolean | undefined;

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

export type WltPaymentController = {
  readonly paymentMethod: PaymentMethodKey;
  readonly setPaymentMethod: (method: PaymentMethodKey) => void;
  readonly paymentDecisionOptions: readonly PaymentDecisionOption[];
  readonly providerPaymentsEnabled: boolean;
  readonly wallet: RepresentativeWallet | null;
  readonly refreshWallet: () => void;
};

function readProviderPaymentsEnabled(): boolean {
  const runtimeProcess = (globalThis as RuntimeGlobal).process;
  const env = runtimeProcess?.env;
  const isDev = typeof __DEV__ !== "undefined" ? Boolean(__DEV__) : env?.["NODE_ENV"] === "development";
  return (
    env?.["EXPO_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED"] === "true" ||
    env?.["NEXT_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED"] === "true" ||
    isDev
  );
}

/**
 * Presentation selector for WLT-owned payment methods.
 *
 * Connects to authoritative WLT financial truth (fetchOwnRepresentativeWallet)
 * and Docker financial simulator.
 */
export function useWltPaymentController(input?: {
  readonly totalMinorUnits?: number;
  readonly currency?: string;
}): WltPaymentController {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cod");
  const [wallet, setWallet] = useState<RepresentativeWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const providerPaymentsEnabled = readProviderPaymentsEnabled();

  const refreshWallet = () => {
    setWalletLoading(true);
    fetchOwnRepresentativeWallet("client")
      .then((w) => {
        setWallet(w);
      })
      .catch(() => {
        setWallet(null);
      })
      .finally(() => {
        setWalletLoading(false);
      });
  };

  useEffect(() => {
    refreshWallet();
  }, []);

  const total = input?.totalMinorUnits ?? 0;
  const walletBalance = wallet?.availableBalanceMinorUnits ?? 0;
  const hasSufficientWallet = walletBalance >= total && total > 0;
  const hasPartialWallet = walletBalance > 0 && walletBalance < total;

  const paymentDecisionOptions = useMemo<readonly PaymentDecisionOption[]>(
    () => [
      {
        id: "cod",
        title: "عند الاستلام (نقدًا)",
        description: "الدفع نقدًا عند استلام الطلب من الكابتن أو المتجر.",
        statusLabel: paymentMethod === "cod" ? "محدد" : "متاح",
        statusTone: paymentMethod === "cod" ? "action" : "success",
        helperText: "الخيار الأسرع بدون الحاجة لرصيد مسبق.",
      },
      {
        id: "wallet",
        title: "من رصيد محفظة بثواني",
        description: "خصم فوري مباشر من رصيد محفظتك الرقمية.",
        disabled: false,
        statusLabel: wallet === null
          ? (walletLoading ? "جاري الفحص..." : "متاح")
          : hasSufficientWallet
            ? (paymentMethod === "wallet" ? "محدد" : "متاح")
            : (walletBalance === 0 ? "الرصيد: 0" : "رصيد غير كافٍ"),
        statusTone: hasSufficientWallet ? (paymentMethod === "wallet" ? "action" : "success") : "warning",
        helperText: wallet
          ? `رصيد المحفظة الحالي: ${formatWltMoney(walletBalance, wallet.currency)}`
          : "متصلة مباشرة بالنظام المالي WLT.",
      },
      {
        id: "official_wallet",
        title: "المحافظ والبنوك الإلكترونية",
        description: "الدفع عبر مزود مالي رسمي (محاكي الدفع الإلكتروني).",
        disabled: false,
        statusLabel: paymentMethod === "official_wallet" ? "محدد" : "متاح (محاكي WLT)",
        statusTone: paymentMethod === "official_wallet" ? "action" : "success",
        helperText: "جاهز ومربوط بمحاكي المعاملات المالية في Docker.",
      },
      {
        id: "mixed",
        title: "دفع مختلط (محفظة + نقدًا)",
        description: "استخدام رصيد المحفظة المتوفر ودفع المتبقي نقدًا.",
        disabled: false,
        statusLabel: hasPartialWallet ? (paymentMethod === "mixed" ? "محدد" : "متاح") : "متاح",
        statusTone: paymentMethod === "mixed" ? "action" : "info",
        helperText: wallet && hasPartialWallet
          ? `رصيدك ${formatWltMoney(walletBalance, wallet.currency)} والباقي نقدًا.`
          : "يتم احتساب الرصيد المتاح وتكملة الباقي نقدًا.",
      },
    ],
    [paymentMethod, providerPaymentsEnabled, wallet, walletLoading, total, walletBalance, hasSufficientWallet, hasPartialWallet],
  );

  return {
    paymentMethod,
    setPaymentMethod,
    paymentDecisionOptions,
    providerPaymentsEnabled,
    wallet,
    refreshWallet,
  };
}
