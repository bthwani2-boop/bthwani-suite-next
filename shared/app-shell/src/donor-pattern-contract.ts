export const DONOR_ALLOWED_EXTRACTION = [
  "visual-reference",
  "state-model-extraction",
  "screen-flow-extraction",
  "arabic-rtl-behavior",
  "search-filter-behavior",
  "api-screen-relationship-analysis",
] as const;

export const DONOR_FORBIDDEN_EXTRACTION = [
  "copying-donor-shell",
  "copying-donor-screens-into-shared-app-shell",
  "importing-donor-code",
  "mock-preview-runtime-data",
  "copying-control-panel-host",
  "mixing-dsh-wlt-inside-app-shell",
] as const;

export const DONOR_PATTERN_CONTRACT = {
  allowed: DONOR_ALLOWED_EXTRACTION,
  forbidden: DONOR_FORBIDDEN_EXTRACTION,
  rule: "The donor repository is evidence and reference only. It is not a runtime dependency and is not copied into app-shell.",
} as const;
