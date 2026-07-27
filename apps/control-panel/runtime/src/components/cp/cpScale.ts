/**
 * Canonical radius / space / type / elevation / motion scales for the
 * control-panel component layer (L2). These are the only legal values for
 * those properties inside `apps/control-panel/runtime/src/components/cp/**`
 * and `services/dsh/frontend/control-panel/**` — they replace the 14 inline +
 * 9 CSS-module radius values, the 25 padding values, the 18 raw fontSize
 * literals (7 spellings of "small"), and the ad hoc `boxShadow` calls found
 * across the control panel.
 *
 * Every number here is derived from `@bthwani/ui-kit/tokens` (`radius`,
 * `spacing`, `typography`, `elevation`, `motion`) — a pixel-scale design
 * system shared with the mobile apps — converted to the rem strings this
 * app's DOM-based components (`CpButton`, `CpTable`, …) consume. Nothing
 * below is a new literal; changing a ui-kit token changes this file's output
 * automatically.
 *
 * NOTE: publishing this module is Phase 0.5 of the control-panel remediation
 * plan. Retrofitting `CpPrimitives`'s own hardcoded values onto it is Phase
 * 1.2 — do not treat the presence of this file as proof those call sites were
 * migrated.
 */
import { alpha, elevation as elevationTokens, motion as motionTokens, radius as radiusTokens, spacing as spacingTokens, typography as typographyTokens } from "@bthwani/ui-kit/tokens";

const REM_BASE_PX = 16;

function px(value: number): string {
  return `${value}px`;
}

function rem(valuePx: number): string {
  return `${valuePx / REM_BASE_PX}rem`;
}

/** Border radius — 4 legal values, replacing the 14 inline + 9 CSS-module ones. */
export const cpRadius = {
  sm: rem(radiusTokens.sm), // 0.5rem
  md: rem(radiusTokens.md), // 0.75rem
  lg: rem(radiusTokens.lg), // 1rem
  pill: px(radiusTokens.round), // 999px
} as const;

/**
 * Spacing — 7 steps on ui-kit's 4px grid, replacing the 25 distinct padding
 * values found across screens.
 */
export const cpSpace = {
  0: rem(spacingTokens[0]),
  1: rem(spacingTokens[1]), // 0.25rem
  2: rem(spacingTokens[2]), // 0.5rem
  3: rem(spacingTokens[3]), // 0.75rem
  4: rem(spacingTokens[4]), // 1rem
  6: rem(spacingTokens[6]), // 1.5rem
  8: rem(spacingTokens[8]), // 2rem
} as const;

/**
 * Typography — 6 roles, replacing the 18 raw fontSize literals (0.75rem /
 * 0.78rem / 0.8rem / 0.813rem / 0.82rem / 12px / 13px were all "small text").
 */
export type CpTypeRole = "display" | "title" | "subtitle" | "body" | "label" | "caption";

function typeRole(token: (typeof typographyTokens)[keyof typeof typographyTokens]) {
  return {
    fontSize: rem(token.fontSize),
    lineHeight: rem(token.lineHeight),
    fontWeight: Number(token.fontWeight),
    letterSpacing: token.letterSpacing ? `${token.letterSpacing / REM_BASE_PX}rem` : undefined,
  } as const;
}

// Each role is pinned to the ui-kit typography token whose pixel size matches
// what the control panel actually rendered before this consolidation (14px
// body text throughout, 20px page headers, 18px state titles, …) — not the
// nearest-sounding name. `body` deliberately maps to `bodySm` (14px), not
// `body` (15px): the pre-existing 0.875rem literals this replaces were 14px,
// and silently shifting every input/table/description size by 1px on a pure
// consolidation pass would be an unstated visual change.
export const cpType: Record<CpTypeRole, ReturnType<typeof typeRole>> = {
  display: typeRole(typographyTokens.titleLg), // 24px — reserved, no current caller
  title: typeRole(typographyTokens.titleMd), // 20px — page headers
  subtitle: typeRole(typographyTokens.titleSm), // 18px — state panel titles
  body: typeRole(typographyTokens.bodySm), // 14px — inputs, tables, descriptions
  label: typeRole(typographyTokens.label), // 13px
  caption: typeRole(typographyTokens.caption), // 12px
};

/**
 * Elevation — 3 levels (ui-kit also exposes `floating`, intentionally not
 * republished here: the control panel's page-frame chrome does not need a
 * fourth level, and adding one back is a one-line change if that changes).
 */
export type CpElevationLevel = "flat" | "raised" | "overlay";

function boxShadow(token: (typeof elevationTokens)[keyof typeof elevationTokens]): string {
  if (token.shadowOpacity === 0) return "none";
  const { width, height } = token.shadowOffset;
  return `${px(width)} ${px(height)} ${px(token.shadowRadius)} ${alpha(token.shadowColor, token.shadowOpacity)}`;
}

export const cpElevation: Record<CpElevationLevel, string> = {
  flat: boxShadow(elevationTokens.flat),
  raised: boxShadow(elevationTokens.raised),
  overlay: boxShadow(elevationTokens.overlay),
};

/** Motion — 3 durations (ms) x 2 easings, reusing `--cp-ease-*` at the CSS-var layer. */
export const cpMotion = {
  duration: {
    quick: motionTokens.duration.quick, // 120
    standard: motionTokens.duration.standard, // 180
    calm: motionTokens.duration.calm, // 240
  },
  easing: {
    standard: "var(--cp-ease-smooth)",
    spring: "var(--cp-ease-spring)",
  },
} as const;

export const cpScale = {
  radius: cpRadius,
  space: cpSpace,
  type: cpType,
  elevation: cpElevation,
  motion: cpMotion,
} as const;
