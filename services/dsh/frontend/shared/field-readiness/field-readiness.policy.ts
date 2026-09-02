import type { DshFieldVisit, DshReadinessCheck } from "./field-readiness.types";

export function canCompleteVisit(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): boolean {
  if (visit.status !== "in_progress") return false;
  const required = checks.filter((check) => check.required);
  return required.length > 0 && required.every((check) => check.status === "passed");
}

