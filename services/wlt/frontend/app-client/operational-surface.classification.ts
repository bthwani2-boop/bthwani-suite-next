export const wltClientSurfaceClassification = {
  surface: "services/wlt/frontend/app-client",
  owner: "wlt",
  kind: "ui_surface",
  role: "surface_root_classification",
  audience: "client",
  decision: "KEEP_ACTIVE",
  runtimeBinding: "not_mounted_here",
  verificationCommand: "pnpm run diagnostics:operational:surfaces && pnpm run diagnostics:operational:gaps",
} as const;
