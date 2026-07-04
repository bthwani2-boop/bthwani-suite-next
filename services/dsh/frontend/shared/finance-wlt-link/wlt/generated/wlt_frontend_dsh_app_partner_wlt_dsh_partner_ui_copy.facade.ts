// wlt_frontend_dsh_app_partner_wlt_dsh_partner_ui_copy.facade.ts
// WLT → DSH bridge: UI copy and commission label utilities
// Authority: This facade is the DSH-side read-only bridge to WLT commission data.
// Source of truth for actual commission rates: services/wlt/frontend/shared/dsh/

export type WltDshPartnerUiCopy = {
  readonly walletSectionTitle: string;
  readonly walletSectionDescription: string;
  readonly financeNotificationTitle: string;
  readonly financeNotificationSubtitle: string;
  readonly commissionRateLabel: string;
};

export const wltDshPartnerUiCopy: WltDshPartnerUiCopy = {
  walletSectionTitle: 'المحفظة',
  walletSectionDescription: 'إدارة الأرباح والمدفوعات عبر WLT',
  financeNotificationTitle: 'تحديث مالي',
  financeNotificationSubtitle: 'راجع حركات المحفظة في بوابة WLT',
  commissionRateLabel: 'نسبة العمولة',
};

export function getWltDshPartnerCommissionLabel(rate: number | string | undefined): string {
  if (rate === undefined || rate === null) return '—';
  const n = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(n)) return String(rate);
  return `${(n * 100).toFixed(1)}%`;
}

export function getWltDshPartnerOperationalModeCommission(
  _modeId: string,
): undefined {
  return undefined;
}
