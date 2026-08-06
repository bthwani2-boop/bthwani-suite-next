// WLT → DSH partner-finance presentation copy.
// Classification: ALLOWED_LOCAL_ADAPTER / READ_ONLY_PROJECTION.
// This file owns labels and formatting only. It is not generated and must not
// define commission truth, rates, eligibility, settlement, payout or ledger state.
// Source of truth for actual commission rates remains WLT backend/contracts.

export type WltDshPartnerUiCopy = {
  readonly walletSectionTitle: string;
  readonly walletSectionDescription: string;
  readonly financeNotificationTitle: string;
  readonly financeNotificationSubtitle: string;
  readonly commissionRateLabel: string;
};

export const wltDshPartnerUiCopy: WltDshPartnerUiCopy = {
  walletSectionTitle: "المحفظة",
  walletSectionDescription: "إدارة الأرباح والمدفوعات عبر WLT",
  financeNotificationTitle: "تحديث مالي",
  financeNotificationSubtitle: "راجع حركات المحفظة في بوابة WLT",
  commissionRateLabel: "نسبة العمولة",
};

export function getWltDshPartnerCommissionLabel(
  rate: number | string | undefined,
): string {
  if (rate === undefined || rate === null) return "—";
  const n = typeof rate === "string" ? parseFloat(rate) : rate;
  if (Number.isNaN(n)) return String(rate);
  return `${(n * 100).toFixed(1)}%`;
}

export function getWltDshPartnerOperationalModeCommission(
  _modeId: string,
): undefined {
  return undefined;
}
