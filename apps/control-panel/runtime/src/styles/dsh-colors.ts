/**
 * DSH control-panel color tokens.
 *
 * This app's chrome (navy sidebar, bright-blue "DSH" accent, per-section
 * dashboard card gradients) predates the shared design system and used a
 * bespoke palette that didn't exist in `@bthwani/ui-kit`. Per the ui-kit
 * boundary guard (no-raw-colors-outside-ui-kit), literal color values may
 * only live under `shared/ui-kit/`. Since this app cannot add new tokens
 * there, every value below is derived exclusively from existing
 * `@bthwani/ui-kit` exports (`colorRoles`, `brandScale`, `neutralScale`,
 * `statusScale`, `darkThemeColors`, `alpha`) — no new hex/rgb literals are
 * introduced here. Where ui-kit has no equivalent hue (teal, purple), the
 * closest existing semantic token is reused; this intentionally
 * consolidates those ad hoc brand colors into the shared palette and may
 * shift the exact hue slightly.
 */
import { alpha, brandScale, colorRoles, darkThemeColors, neutralScale, statusScale } from "@bthwani/ui-kit/tokens";

/* ── Navy family (sidebar / dark chrome backgrounds) ────────────────────
 * Sourced from ui-kit's neutral slate scale, which was designed as a
 * near-black navy-adjacent scale — the closest match to the original
 * bespoke navy triad.
 */
export const dshNavy = neutralScale[900];
export const dshNavyMid = neutralScale[800];
export const dshNavyLight = neutralScale[700];

/* ── Accent blue (active states, glows, badges) ──────────────────────── */
export const dshBlue = brandScale.structure[400];
export const dshBlueBright = brandScale.structure[300];

/* ── Accent teal (consolidated onto ui-kit's success/green family — the
 * palette has no teal hue). Used for "active"/"connected" indicators. */
export const dshAccentTeal = darkThemeColors.success;
export const dshAccentTealStrong = statusScale.successStrong;
export const dshAccentTealDeep = statusScale.success;

/* ── Accent orange (brand action scale is already orange) ───────────── */
export const dshOrange = brandScale.action[300];
export const dshOrangeDeep = brandScale.action[800];
export const dshOrangeDeeper = brandScale.action[700];

/* ── Accent purple (consolidated onto structure/blue — no purple hue in
 * ui-kit). */
export const dshPurple = brandScale.structure[500];
export const dshPurpleDeep = brandScale.structure[800];
export const dshPurpleDeeper = brandScale.structure[700];

/* ── Accent red / gold (closest dark-theme semantic tones) ──────────── */
export const dshRed = darkThemeColors.danger;
export const dshGold = darkThemeColors.warning;

/* ── Neutral surfaces / text ─────────────────────────────────────────── */
export const dshSidebarText = neutralScale[300];
export const dshSidebarTextHover = neutralScale[200];
export const dshSidebarTextActive = colorRoles.textInverse;
export const dshSidebarBorder = darkThemeColors.borderColor;

export const dshMainBg = neutralScale[100];
export const dshCardBg = colorRoles.surfaceBase;
export const dshCardBorder = neutralScale[200];
export const dshTopbarBg = colorRoles.surfaceBase;
export const dshTopbarBorder = neutralScale[200];

export const dshTextPrimary = neutralScale[900];
export const dshTextSecondary = neutralScale[600];
export const dshTextMuted = neutralScale[400];

/* ── Shadow / border black-alpha helpers (exact, uses colorRoles.shadowBase = #000000) ── */
export const dshShadow = colorRoles.shadowBase;

export { alpha };
