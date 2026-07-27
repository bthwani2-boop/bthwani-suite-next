/**
 * Canonical `--cp-*` CSS custom property map for the control-panel shell chrome.
 *
 * Scope correction vs. the original plan: `--bthwani-*` / `--bth-*` / `--ui-*`
 * are NOT app-local drift — they are generated and already cross-aliased by
 * `shared/ui-kit/src/foundation.ts` (`createTokenCssVariables` /
 * `createThemeCssVariables`, injected via `<WebThemeStyle />` in
 * `app/layout.tsx`). That layer is the legitimate L1 output and is left
 * untouched here.
 *
 * The genuine competing namespace was the app-local block that `app/layout.tsx`
 * used to inline directly (`--dsh-*`, unprefixed `--sidebar-*` / `--card-*` /
 * `--main-bg` / `--topbar-*` / `--text-*` / `--grad-*`) — values that bypass
 * ui-kit's generator entirely. This module is the single generator for that
 * block, under the `--cp-*` prefix, derived from the same underlying values
 * (`src/styles/dsh-colors.ts`, itself derived from `@bthwani/ui-kit/tokens`).
 *
 * `app/layout.tsx` renders these as the canonical set, plus a temporary block
 * of `--dsh-*`/unprefixed aliases pointing at `var(--cp-*)` so existing call
 * sites keep working. The aliases are deleted at the end of Phase 4 (see the
 * control-panel remediation plan, section 0.4 / 4.9).
 */
import {
  alpha,
  dshAccentTeal,
  dshAccentTealDeep,
  dshBlue,
  dshBlueBright,
  dshCardBg,
  dshCardBorder,
  dshMainBg,
  dshNavy,
  dshNavyLight,
  dshNavyMid,
  dshOrange,
  dshOrangeDeeper,
  dshPurple,
  dshPurpleDeep,
  dshSidebarBorder,
  dshSidebarText,
  dshSidebarTextActive,
  dshTextMuted,
  dshTextPrimary,
  dshTextSecondary,
  dshTopbarBg,
  dshTopbarBorder,
} from "./dsh-colors";

/** Canonical `--cp-*` variable declarations, in source order. */
export function buildCpCssVariables(): Record<string, string> {
  return {
    // Brand
    "--cp-navy": dshNavy,
    "--cp-navy-mid": dshNavyMid,
    "--cp-navy-light": dshNavyLight,
    "--cp-blue": dshBlue,
    "--cp-blue-glow": alpha(dshBlue, 0.2),
    "--cp-blue-bright": dshBlueBright,
    "--cp-accent-teal": dshAccentTeal,

    // Sidebar
    "--cp-sidebar-bg": "var(--cp-navy)",
    "--cp-sidebar-hover": "var(--cp-navy-mid)",
    "--cp-sidebar-active": "var(--cp-navy-light)",
    "--cp-sidebar-text": dshSidebarText,
    "--cp-sidebar-text-active": dshSidebarTextActive,
    "--cp-sidebar-border": dshSidebarBorder,
    "--cp-sidebar-width": "15.5rem",

    // Main content
    "--cp-main-bg": dshMainBg,
    "--cp-card-bg": dshCardBg,
    "--cp-card-border": dshCardBorder,
    "--cp-card-shadow": `0 1px 3px ${alpha(dshTextPrimary, 0.07)}, 0 4px 16px ${alpha(dshTextPrimary, 0.06)}`,
    "--cp-card-shadow-hover": `0 8px 32px ${alpha(dshBlue, 0.15)}, 0 2px 8px ${alpha(dshTextPrimary, 0.1)}`,

    // Topbar
    "--cp-topbar-bg": dshTopbarBg,
    "--cp-topbar-border": dshTopbarBorder,
    "--cp-topbar-height": "3.75rem",

    // Text
    "--cp-text-primary": dshTextPrimary,
    "--cp-text-secondary": dshTextSecondary,
    "--cp-text-muted": dshTextMuted,

    // Gradients
    "--cp-grad-blue": `linear-gradient(135deg, ${dshBlue} 0%, ${dshBlueBright} 100%)`,
    "--cp-grad-teal": `linear-gradient(135deg, ${dshAccentTeal} 0%, ${dshAccentTealDeep} 100%)`,
    "--cp-grad-orange": `linear-gradient(135deg, ${dshOrange} 0%, ${dshOrangeDeeper} 100%)`,
    "--cp-grad-purple": `linear-gradient(135deg, ${dshPurple} 0%, ${dshPurpleDeep} 100%)`,

    // Animation
    "--cp-ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "--cp-ease-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

/**
 * Temporary back-compat aliases for the pre-Phase-0 variable names, each
 * pointing at its `--cp-*` replacement. Deleted in Phase 4.9 once every call
 * site has migrated to `--cp-*` directly.
 */
export function buildCpLegacyAliasVariables(): Record<string, string> {
  return {
    "--dsh-navy": "var(--cp-navy)",
    "--dsh-navy-mid": "var(--cp-navy-mid)",
    "--dsh-navy-light": "var(--cp-navy-light)",
    "--dsh-blue": "var(--cp-blue)",
    "--dsh-blue-glow": "var(--cp-blue-glow)",
    "--dsh-blue-bright": "var(--cp-blue-bright)",
    "--dsh-accent-teal": "var(--cp-accent-teal)",

    "--sidebar-bg": "var(--cp-sidebar-bg)",
    "--sidebar-hover": "var(--cp-sidebar-hover)",
    "--sidebar-active": "var(--cp-sidebar-active)",
    "--sidebar-text": "var(--cp-sidebar-text)",
    "--sidebar-text-active": "var(--cp-sidebar-text-active)",
    "--sidebar-border": "var(--cp-sidebar-border)",
    "--sidebar-width": "var(--cp-sidebar-width)",

    "--main-bg": "var(--cp-main-bg)",
    "--card-bg": "var(--cp-card-bg)",
    "--card-border": "var(--cp-card-border)",
    "--card-shadow": "var(--cp-card-shadow)",
    "--card-shadow-hover": "var(--cp-card-shadow-hover)",

    "--topbar-bg": "var(--cp-topbar-bg)",
    "--topbar-border": "var(--cp-topbar-border)",
    "--topbar-height": "var(--cp-topbar-height)",

    "--text-primary": "var(--cp-text-primary)",
    "--text-secondary": "var(--cp-text-secondary)",
    "--text-muted": "var(--cp-text-muted)",

    "--grad-blue": "var(--cp-grad-blue)",
    "--grad-teal": "var(--cp-grad-teal)",
    "--grad-orange": "var(--cp-grad-orange)",
    "--grad-purple": "var(--cp-grad-purple)",

    "--ease-spring": "var(--cp-ease-spring)",
    "--ease-smooth": "var(--cp-ease-smooth)",
  };
}

/** Renders a variable map as CSS custom-property declaration lines. */
export function renderCssVariableBlock(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `            ${name}: ${value};`)
    .join("\n");
}
