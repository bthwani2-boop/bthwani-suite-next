export const wltPartnerSurfaceClassification = {
  surface: "services/wlt/frontend/app-partner",
  owner: "wlt",
  kind: "ui_surface",
  role: "surface_root_classification",
  audience: "partner",
  decision: "KEEP_ACTIVE",
  runtimeBinding: "not_mounted_here",
  verificationCommand: "pnpm run diagnostics:operational:surfaces && pnpm run diagnostics:operational:gaps",
} as const;
