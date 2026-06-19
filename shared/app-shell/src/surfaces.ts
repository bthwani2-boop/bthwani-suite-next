export const CANONICAL_SURFACES = [
  "app-client",
  "app-partner",
  "app-captain",
  "app-field",
  "control-panel",
  "webapp",
  "website",
] as const;

export const CURRENT_PHASE_SURFACES = [
  "app-client",
  "app-partner",
  "app-captain",
  "app-field",
  "control-panel",
] as const;

export const RESERVED_SURFACES = ["webapp", "website"] as const;

export type CanonicalSurfaceName = (typeof CANONICAL_SURFACES)[number];
export type CurrentPhaseSurfaceName = (typeof CURRENT_PHASE_SURFACES)[number];
export type ReservedSurfaceName = (typeof RESERVED_SURFACES)[number];

export function isCanonicalSurfaceName(
  value: string,
): value is CanonicalSurfaceName {
  return (CANONICAL_SURFACES as readonly string[]).includes(value);
}

export function isCurrentPhaseSurfaceName(
  value: string,
): value is CurrentPhaseSurfaceName {
  return (CURRENT_PHASE_SURFACES as readonly string[]).includes(value);
}

export function isReservedSurfaceName(
  value: string,
): value is ReservedSurfaceName {
  return (RESERVED_SURFACES as readonly string[]).includes(value);
}
