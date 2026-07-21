import type { DshCapability } from "./capability-map";
import { DSH_CAPABILITIES } from "./capabilities";

export type DshRuntimeEvidenceState =
  | "NONE"
  | "HISTORICAL_NOT_SAME_COMMIT"
  | "SAME_COMMIT_VERIFIED";

export type DshRuntimeBinding = {
  readonly capabilityId: DshCapability["id"];
  readonly contractOperations: readonly string[];
  readonly backendImplemented: boolean;
  readonly runtimeEvidence: string | null;
  readonly runtimeEvidenceCommitSha: string | null;
  readonly evidenceState: DshRuntimeEvidenceState;
  readonly state:
    | "blocked"
    | "verified"
    | "experience-fix-required"
    | "client-reverified-only"
    | "incomplete";
  readonly runtimeBound: boolean;
  readonly screensReady: boolean;
  readonly databaseReady: boolean;
  readonly generatedClientReady: boolean;
  readonly sharedBrainReady: boolean;
  readonly surfaceBindingApproved: boolean;
};

const historicalRuntimeEvidence: Partial<
  Record<DshCapability["id"], string>
> = {
  "dsh.system.readiness":
    "services/dsh/evidence/Store Discovery-store-discovery-fullstack-multi-surface",
  "dsh.store.discovery":
    "services/dsh/evidence/Store Discovery-store-discovery-fullstack-multi-surface",
  "dsh.client.home-discovery":
    "services/dsh/evidence/Home Discovery-client-home-discovery",
  "dsh.client.catalog":
    "services/dsh/evidence/Catalog Management-catalog-fullstack",
  "dsh.client.cart": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.client.checkout": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.client.orders": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.client.dispatch": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.field.readiness": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.support.hub": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.operator.analytics": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.notifications": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.marketing": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.policies": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.admin": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
  "dsh.partner.activation": "services/dsh/evidence/bthwani-ponytail-yagni-fullstack",
};

/**
 * This map records implementation posture, not release approval.
 * Historical evidence paths are retained for traceability but cannot produce a
 * runtime PASS until the evidence is regenerated for the same immutable commit.
 */
export const DSH_RUNTIME_MAP = DSH_CAPABILITIES.map((capability) => {
  const runtimeEvidence = historicalRuntimeEvidence[capability.id] ?? null;

  return {
    capabilityId: capability.id,
    contractOperations: capability.contractOperations,
    backendImplemented: true,
    runtimeEvidence,
    runtimeEvidenceCommitSha: null,
    evidenceState: runtimeEvidence ? "HISTORICAL_NOT_SAME_COMMIT" : "NONE",
    state: "experience-fix-required",
    runtimeBound: capability.runtimeBound,
    screensReady: false,
    databaseReady: true,
    generatedClientReady: true,
    sharedBrainReady: false,
    surfaceBindingApproved: false,
  } as const;
}) satisfies readonly DshRuntimeBinding[];
