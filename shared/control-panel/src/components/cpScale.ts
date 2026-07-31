/** Canonical token-derived scales for control-panel components. */
import { alpha, elevation as elevationTokens, motion as motionTokens, radius as radiusTokens, spacing as spacingTokens, typography as typographyTokens } from "@bthwani/ui-kit/tokens";
const REM_BASE_PX = 16;
const px = (value: number) => `${value}px`;
const rem = (valuePx: number) => `${valuePx / REM_BASE_PX}rem`;
export const cpRadius = { sm: rem(radiusTokens.sm), md: rem(radiusTokens.md), lg: rem(radiusTokens.lg), pill: px(radiusTokens.round) } as const;
export const cpSpace = { 0: rem(spacingTokens[0]), 1: rem(spacingTokens[1]), 2: rem(spacingTokens[2]), 3: rem(spacingTokens[3]), 4: rem(spacingTokens[4]), 6: rem(spacingTokens[6]), 8: rem(spacingTokens[8]) } as const;
export type CpTypeRole = "display" | "title" | "subtitle" | "body" | "label" | "caption";
function typeRole(token: (typeof typographyTokens)[keyof typeof typographyTokens]) { return { fontSize: rem(token.fontSize), lineHeight: rem(token.lineHeight), fontWeight: Number(token.fontWeight), letterSpacing: token.letterSpacing ? `${token.letterSpacing / REM_BASE_PX}rem` : undefined } as const; }
export const cpType: Record<CpTypeRole, ReturnType<typeof typeRole>> = { display: typeRole(typographyTokens.titleLg), title: typeRole(typographyTokens.titleMd), subtitle: typeRole(typographyTokens.titleSm), body: typeRole(typographyTokens.bodySm), label: typeRole(typographyTokens.label), caption: typeRole(typographyTokens.caption) };
export type CpElevationLevel = "flat" | "raised" | "overlay";
function boxShadow(token: (typeof elevationTokens)[keyof typeof elevationTokens]): string { if (token.shadowOpacity === 0) return "none"; const { width, height } = token.shadowOffset; return `${px(width)} ${px(height)} ${px(token.shadowRadius)} ${alpha(token.shadowColor, token.shadowOpacity)}`; }
export const cpElevation: Record<CpElevationLevel, string> = { flat: boxShadow(elevationTokens.flat), raised: boxShadow(elevationTokens.raised), overlay: boxShadow(elevationTokens.overlay) };
export const cpMotion = { duration: { quick: motionTokens.duration.quick, standard: motionTokens.duration.standard, calm: motionTokens.duration.calm }, easing: { standard: "var(--cp-ease-smooth)", spring: "var(--cp-ease-spring)" } } as const;
export const cpScale = { radius: cpRadius, space: cpSpace, type: cpType, elevation: cpElevation, motion: cpMotion } as const;
