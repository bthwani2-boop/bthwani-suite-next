export const CANONICAL_SERVICES = [
  "dsh",
  "wlt",
  "knz",
  "arb",
  "amn",
  "esf",
  "mrf",
  "snd",
  "kwd",
] as const;

export const CURRENT_PHASE_SERVICES = ["dsh", "wlt"] as const;

export const RESERVED_SERVICES = [
  "knz",
  "arb",
  "amn",
  "esf",
  "mrf",
  "snd",
  "kwd",
] as const;

export type CanonicalServiceName = (typeof CANONICAL_SERVICES)[number];
export type CurrentPhaseServiceName = (typeof CURRENT_PHASE_SERVICES)[number];
export type ReservedServiceName = (typeof RESERVED_SERVICES)[number];

export function isCanonicalServiceName(
  value: string,
): value is CanonicalServiceName {
  return (CANONICAL_SERVICES as readonly string[]).includes(value);
}

export function isCurrentPhaseServiceName(
  value: string,
): value is CurrentPhaseServiceName {
  return (CURRENT_PHASE_SERVICES as readonly string[]).includes(value);
}

export function isReservedServiceName(
  value: string,
): value is ReservedServiceName {
  return (RESERVED_SERVICES as readonly string[]).includes(value);
}
