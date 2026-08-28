// Canonical location: dsh/frontend/shared/platform/platform-vars.policy.ts
// Authority: dsh/frontend/shared/platform — domain constants and policy types for platform vars UI.
// Rule: read-only; no local apply/rollback/mark-contract-ready logic lives here.
// All mutations must go through a backend API or be explicitly disabled-by-policy.

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

export function isPlatformDesignVar(varKey: string): boolean {
  return varKey.startsWith('VAR_UI_');
}
