// WLT → DSH captain-finance presentation copy.
// Classification: ALLOWED_LOCAL_ADAPTER / READ_ONLY_PROJECTION.
// This file owns labels only. It is not generated and must not define wallet,
// COD, commission, settlement, payout, balance or ledger truth.

export type WltDshCaptainUiCopy = {
  summaryLabel: string;
  financeTitle: string;
  financeSubtitle: string;
  badgeLabel: string;
  walletAccessibilityLabel: string;
};

export const wltDshCaptainUiCopy = {
  summaryLabel: "المحفظة",
  financeTitle: "المالية",
  financeSubtitle: "المحفظة والأرباح والتسويات في صفحة واحدة.",
  badgeLabel: "مالي",
  walletAccessibilityLabel: "المحفظة",
} as const satisfies WltDshCaptainUiCopy;

export function buildWltDshCaptainTopBarLocationLabel(
  walletBalanceLabel?: string | null,
): string {
  return walletBalanceLabel ? `المحفظة · ${walletBalanceLabel}` : "المحفظة";
}
