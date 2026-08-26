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
 * The genuine competing namespace was a historical app-local block that
 * bypassed ui-kit's generator entirely. This module is the single generator
 * for control-panel chrome, under the `--cp-*` prefix, derived from the same values
 * (`src/styles/dsh-colors.ts`, itself derived from `@bthwani/ui-kit/tokens`).
 *
 * All control-panel consumers use this namespace directly. No legacy aliases
 * are emitted, so a missing `--cp-*` reference is visible during verification
 * instead of silently resolving through a parallel variable namespace.
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
  dshFocusRing,
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
    "--cp-focus-ring": dshFocusRing,

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

/** Renders a variable map as CSS custom-property declaration lines. */
export function renderCssVariableBlock(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `            ${name}: ${value};`)
    .join("\n");
}
