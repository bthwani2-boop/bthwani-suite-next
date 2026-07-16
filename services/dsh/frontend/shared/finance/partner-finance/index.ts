// Stable import surface for partner-hub finance/WLT bindings.
// The generated facade paths are long and implementation-detail-y; consumers
// (e.g. app-partner/account/*) should import from here instead of reaching
// into shared/finance-wlt-link/wlt/generated/* directly.
export {
  getWltDshPartnerCommissionLabel,
  getWltDshPartnerOperationalModeCommission,
  wltDshPartnerUiCopy,
} from '../../finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_partner_wlt_dsh_partner_ui_copy.facade';

export { WltDshPartnerBridge } from '../../finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_partner.facade';
