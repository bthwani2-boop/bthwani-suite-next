import type { DshFieldVisit, DshReadinessCheck, DshCheckType } from "./field-readiness.types";

export function canCompleteVisit(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): boolean {
  if (visit.status !== "in_progress") return false;
  const required = checks.filter((check) => check.required);
  return required.length > 0 && required.every((check) => check.status === "passed");
}

export function visitCompletionBlockers(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): DshCheckType[] {
  if (visit.status !== "in_progress") return [];
  return checks.filter((check) => check.required && check.status !== "passed").map((check) => check.checkType);
}

function isOnboardingComplete(totalCompletedVisits: number, openEscalations: number): boolean {
  return totalCompletedVisits > 0 && openEscalations === 0;
}
