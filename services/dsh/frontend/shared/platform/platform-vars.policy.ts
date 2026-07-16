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
// Design vars (VAR_UI_*) must use quick-picks exclusively — free-form is forbidden.
// Operational and financial values are intentionally absent until platform-control
// and WLT-backed read models provide real runtime truth.

export const PLATFORM_VAR_QUICK_PICKS: Record<string, readonly string[]> = {
  VAR_UI_APPEARANCE_MODE:                  ['lightPremium', 'darkGlass'],
  VAR_UI_FONT_PROFILE:                     ['arabic-system', 'arabic-premium', 'arabic-readable'],
  VAR_UI_DENSITY_PROFILE:                  ['compact', 'comfortable', 'spacious'],
  VAR_UI_RADIUS_PROFILE:                   ['soft', 'balanced', 'sharp'],
  VAR_UI_MOTION_PROFILE:                   ['reduced', 'standard', 'expressive'],
  VAR_UI_MARKETING_EMPHASIS:               ['calm', 'premium', 'campaign'],
  VAR_UI_CONTROL_PANEL_DENSITY:            ['compact', 'balanced'],
} as const;

// ── Mutation policy ───────────────────────────────────────────────────────────
// No proposed-value mutation is applied locally or as a UI simulation.
// Backend API contracts are required before proposals can be saved.

export type PlatformVarMutationAction = 'save-proposed' | 'apply' | 'rollback' | 'mark-contract-ready';

const PLATFORM_VAR_MUTATION_DISABLED_REASON: Record<PlatformVarMutationAction, string> = {
  'save-proposed':       'حفظ المقترحات يتطلب عقد platform-control موثق — غير مفعّل حالياً',
  'apply':               'تطبيق مقترح يتطلب عقد Backend موثق — غير مفعّل حالياً',
  'rollback':            'الرجوع يتطلب مسار Backend موثق — غير مفعّل حالياً',
  'mark-contract-ready': 'التعليم بالعقد يتطلب مسار Backend موثق — غير مفعّل حالياً',
};

function isPlatformVarMutationAllowed(
  action: PlatformVarMutationAction,
  varKey: string,
): boolean {
  void varKey;
  void action;
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
