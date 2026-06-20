export const ALLOWED_SERVICE_SCREEN_ROOT =
  "services/<service>/frontend/<surface>" as const;

export const FORBIDDEN_SCREEN_ROOTS = [
  "shared/app-shell",
  "shared/ui-kit",
  "core",
  "apps/*/runtime",
] as const;

export const SCREEN_PLACEMENT_CONTRACT = {
  allowedRoot: ALLOWED_SERVICE_SCREEN_ROOT,
  forbiddenRoots: FORBIDDEN_SCREEN_ROOTS,
  rule: "Service-owned screens must live under services/<service>/frontend/<surface>. Runtime apps mount public service entrypoints only.",
} as const;
