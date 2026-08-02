export type WltDshCaptainUiCopy = {
  summaryLabel: string;
  financeTitle: string;
  financeSubtitle: string;
  badgeLabel: string;
  walletAccessibilityLabel: string;
};

export const wltDshCaptainUiCopy = {
  summaryLabel: 'المحفظة',
  financeTitle: 'المالية',
  financeSubtitle: 'المحفظة والأرباح والتسويات في صفحة واحدة.',
  badgeLabel: 'مالي',
  walletAccessibilityLabel: 'المحفظة',
} as const satisfies WltDshCaptainUiCopy;

export function buildWltDshCaptainTopBarLocationLabel(walletBalanceLabel?: string | null): string {
  return walletBalanceLabel ? `المحفظة · ${walletBalanceLabel}` : 'المحفظة';
}
