export const APP_SHELL_ALLOWED_RESPONSIBILITIES = [
  "surface-name-contracts",
  "service-name-contracts",
  "current-phase-service-surface-map",
  "service-slot-contracts",
  "screen-placement-contracts",
  "ui-kit-consumption-contracts",
  "donor-pattern-contracts",
  "runtime-neutral-boundaries",
] as const;

export const APP_SHELL_FORBIDDEN_RESPONSIBILITIES = [
  "service-screens",
  "service-business-logic",
  "api-clients",
  "direct-fetch",
  "axios",
  "mock-runtime-data",
  "preview-runtime-data",
  "design-tokens",
  "tamagui-components",
  "control-panel-routes",
  "mobile-navigation-runtime",
  "auth-session-runtime",
  "service-specific-props",
  "next-runtime",
  "react-dom-runtime",
  "reserved-service-activation",
  "reserved-artifact-creation-without-activation-gate",
] as const;

export const APP_SHELL_BOUNDARY_CONTRACT = {
  allowed: APP_SHELL_ALLOWED_RESPONSIBILITIES,
  forbidden: APP_SHELL_FORBIDDEN_RESPONSIBILITIES,
  rule: "shared/app-shell is contracts-only in Phase 9A. Runtime shell files are reserved until an active slice proves the need.",
} as const;
