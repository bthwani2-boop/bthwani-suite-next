// Canonical location: dsh/frontend/shared/platform/platform-vars.policy.ts
// Authority: dsh/frontend/shared/platform — domain constants and policy types for platform vars UI.
// Rule: this file contains presentation hints only. It never stores a runtime
// value and never applies, rolls back, or marks a contract ready locally.
// All mutations go through the core/platform-control change-set API.

// ── Quick-pick values per var key ─────────────────────────────────────────────
// Design vars (VAR_UI_*) must use quick-picks exclusively — free-form is forbidden.
// Quick picks are only editor suggestions; the selected value is still submitted
// through the governed change-set workflow and is never treated as local truth.

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
// No proposed-value mutation is applied locally or simulated in the UI.

export function isPlatformDesignVar(varKey: string): boolean {
  return varKey.startsWith('VAR_UI_');
}
