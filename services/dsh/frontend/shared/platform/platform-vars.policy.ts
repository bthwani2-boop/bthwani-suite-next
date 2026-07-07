// Canonical location: dsh/frontend/shared/platform/platform-vars.policy.ts
// Authority: dsh/frontend/shared/platform — domain constants and policy types for platform vars UI.
// Rule: read-only; no local apply/rollback/mark-contract-ready logic lives here.
// All mutations must go through a backend API or be explicitly disabled-by-policy.

import type {
  DshPlatformVarStatus,
  DshPlatformVarRisk,
} from './platform.types';

// ── Status badge display policy ───────────────────────────────────────────────

export type PlatformVarStatusBadge = {
  readonly label: string;
  readonly cssClass: string;
};

const PLATFORM_VAR_STATUS_BADGE: Record<DshPlatformVarStatus, PlatformVarStatusBadge> = {
  'runtime-bound':       { label: 'مرتبط تشغيلياً', cssClass: 'badgeBinding' },
  'contract-required':   { label: 'يتطلب عقداً',    cssClass: 'badgeContract' },
  'read-only-reference': { label: 'مرجع قراءة',      cssClass: 'badgeReference' },
  'disabled-by-policy':  { label: 'محجوب بالسياسة', cssClass: 'badgeDisabled' },
};

// ── Risk display policy ───────────────────────────────────────────────────────

const PLATFORM_VAR_RISK_CSS_CLASS: Record<DshPlatformVarRisk, string> = {
  low:       'riskLow',
  medium:    'riskMedium',
  high:      'riskHigh',
  financial: 'riskFinancial',
};

const PLATFORM_VAR_RISK_LABEL: Record<DshPlatformVarRisk, string> = {
  low:       'منخفضة',
  medium:    'متوسطة',
  high:      'عالية',
  financial: 'مالية',
};

const PLATFORM_VAR_STATUS_LABEL: Record<DshPlatformVarStatus, string> = {
  'runtime-bound':       'مرتبط بعقد تشغيل موثق',
  'contract-required':   'يتطلب عقد Backend أو Provider',
  'read-only-reference': 'مرجع قراءة فقط',
  'disabled-by-policy':  'محجوب بالسياسة',
};

// ── Quick-pick values per var key ─────────────────────────────────────────────
// These are the only allowed proposed values for each operational key.
// Design vars (VAR_UI_*) must use quick-picks exclusively — free-form is forbidden.

export const PLATFORM_VAR_QUICK_PICKS: Record<string, readonly string[]> = {
  VAR_DSH_VISIBILITY_REGION_SANAA:         ['مفعّل', 'مفعّل مع القيود', 'مخفي'],
  VAR_DSH_CAPTAIN_MIN_WALLET_BALANCE:      ['5,000 ريال', '10,000 ريال', '15,000 ريال', '20,000 ريال'],
  VAR_DSH_PARTNER_ACCEPTANCE_TIMEOUT_SECS: ['45 ثانية', '60 ثانية', '90 ثانية'],
  VAR_DSH_DISPATCH_SEARCH_RADIUS_KM:       ['2.5 كم', '3.5 كم', '5.0 كم'],
  VAR_DSH_PARTNER_SETTLEMENT_SCHEDULE:     ['يومياً 10:00 ص', 'كل أحد 10:00 ص', 'كل ثلاثاء 10:00 ص'],
  VAR_UI_APPEARANCE_MODE:                  ['lightPremium', 'darkGlass'],
  VAR_UI_FONT_PROFILE:                     ['arabic-system', 'arabic-premium', 'arabic-readable'],
  VAR_UI_DENSITY_PROFILE:                  ['compact', 'comfortable', 'spacious'],
  VAR_UI_RADIUS_PROFILE:                   ['soft', 'balanced', 'sharp'],
  VAR_UI_MOTION_PROFILE:                   ['reduced', 'standard', 'expressive'],
  VAR_UI_MARKETING_EMPHASIS:               ['calm', 'premium', 'campaign'],
  VAR_UI_CONTROL_PANEL_DENSITY:            ['compact', 'balanced'],
} as const;

// ── Mutation policy ───────────────────────────────────────────────────────────
// All proposed-value mutations are UI simulation only.
// No mutation is applied to live servers — backend API contract is required for real application.

export type PlatformVarMutationAction = 'save-proposed' | 'apply' | 'rollback' | 'mark-contract-ready';

const PLATFORM_VAR_MUTATION_DISABLED_REASON: Record<PlatformVarMutationAction, string> = {
  'save-proposed':       'حفظ القيمة المقترحة (محلي فقط — لا يُطبَّق على الخوادم)',
  'apply':               'تطبيق مقترح يتطلب عقد Backend موثق — غير مفعّل حالياً',
  'rollback':            'الرجوع يتطلب مسار Backend موثق — غير مفعّل حالياً',
  'mark-contract-ready': 'التعليم بالعقد يتطلب مسار Backend موثق — غير مفعّل حالياً',
};

function isPlatformVarMutationAllowed(
  action: PlatformVarMutationAction,
  varKey: string,
): boolean {
  if (action === 'save-proposed') return true;
  void varKey;
  return false;
}

export function isPlatformDesignVar(varKey: string): boolean {
  return varKey.startsWith('VAR_UI_');
}

function isPlatformDesignValValid(varKey: string, proposedValue: string): boolean {
  if (!isPlatformDesignVar(varKey)) return true;
  const picks = PLATFORM_VAR_QUICK_PICKS[varKey];
  return Array.isArray(picks) && picks.includes(proposedValue);
}
