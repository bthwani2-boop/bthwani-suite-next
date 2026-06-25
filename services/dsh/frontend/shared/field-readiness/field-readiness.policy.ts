import type { DshFieldVisit, DshReadinessCheck, DshCheckType } from "./field-readiness.types";

export const ALL_CHECK_TYPES: DshCheckType[] = [
  "location_verified",
  "documents_uploaded",
  "product_list_submitted",
  "equipment_checked",
  "safety_compliant",
  "hygiene_compliant",
];

export function canCompleteVisit(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): boolean {
  if (visit.status !== "in_progress") return false;
  const passed = new Set(checks.filter((c) => c.status === "passed").map((c) => c.checkType));
  return ALL_CHECK_TYPES.every((t) => passed.has(t));
}

export function visitCompletionBlockers(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): DshCheckType[] {
  if (visit.status !== "in_progress") return [];
  const passed = new Set(checks.filter((c) => c.status === "passed").map((c) => c.checkType));
  return ALL_CHECK_TYPES.filter((t) => !passed.has(t));
}

export function isOnboardingComplete(totalCompletedVisits: number, openEscalations: number): boolean {
  return totalCompletedVisits > 0 && openEscalations === 0;
}
