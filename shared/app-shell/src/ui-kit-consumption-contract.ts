export const UI_KIT_ALLOWED_CONSUMPTION = [
  "public-exports-only",
  "tokens-through-public-api",
  "theme-through-public-api",
  "components-through-public-api",
  "visual-patterns-rebuilt-through-ui-kit",
] as const;

export const UI_KIT_FORBIDDEN_CONSUMPTION = [
  "ui-kit-deep-imports",
  "direct-tamagui-imports",
  "raw-random-colors",
  "local-design-systems",
  "duplicated-reusable-button-card-header-systems",
  "editing-ui-kit-during-phase-9a",
] as const;

export const UI_KIT_CONSUMPTION_CONTRACT = {
  allowed: UI_KIT_ALLOWED_CONSUMPTION,
  forbidden: UI_KIT_FORBIDDEN_CONSUMPTION,
  rule: "Phase 9A consumes the existing design package through public exports only and does not edit it.",
} as const;
