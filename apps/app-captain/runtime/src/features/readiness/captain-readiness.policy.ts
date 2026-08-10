import type { ReadinessGate } from "../../../../../../services/dsh/frontend/shared/workforce/workforce.types";

export type CaptainReadinessPresentation = "loading" | "blocked" | "allowed" | "unknown";

type ReadinessIdentity = Pick<ReadinessGate, "actorId" | "workforceKind">;

export function classifyCaptainReadiness(
  readiness: ReadinessGate | null | undefined,
): CaptainReadinessPresentation {
  if (!readiness) return "loading";
  if (readiness.status === "BLOCKED") return "blocked";
  if (readiness.status === "ALLOWED") return "allowed";
  return "unknown";
}

export function createCaptainEligibilityUnavailableGate(
  identity: ReadinessIdentity,
  checkedAt = new Date().toISOString(),
): ReadinessGate {
  return {
    actorId: identity.actorId,
    workforceKind: identity.workforceKind,
    status: "BLOCKED",
    blockerReasons: ["ELIGIBILITY_UNAVAILABLE"],
    checkedAt,
  };
}
