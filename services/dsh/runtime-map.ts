import type { DshCapability } from "./capability-map";
import { DSH_CAPABILITIES } from "./capabilities";

export type DshRuntimeEvidenceState = "NONE" | "SAME_COMMIT_VERIFIED";

export type DshRuntimeBinding = {
  readonly capabilityId: DshCapability["id"];
  readonly contractOperations: readonly string[];
  /** Static source presence only; this is not runtime, database, or release proof. */
  readonly backendImplemented: boolean;
  /** Current-candidate evidence only. Historical evidence belongs in reports, not runtime truth. */
  readonly runtimeEvidence: string | null;
  readonly runtimeEvidenceCommitSha: string | null;
  readonly evidenceState: DshRuntimeEvidenceState;
  readonly state:
    | "blocked"
    | "verified"
    | "experience-fix-required"
    | "client-reverified-only"
    | "incomplete";
  /** Static binding declaration from the capability map; not proof that the current runtime is healthy. */
  readonly runtimeBound: boolean;
  readonly screensReady: boolean;
  readonly databaseReady: boolean;
  readonly generatedClientReady: boolean;
  readonly sharedBrainReady: boolean;
  readonly surfaceBindingApproved: boolean;
};

function unresolvedState(
  capability: Pick<DshCapability, "status" | "closureState">,
): DshRuntimeBinding["state"] {
  if (capability.status === "blocked-runtime") return "blocked";
  if (capability.status === "planned" || capability.status === "contract-active") return "incomplete";
  if (capability.closureState === "CLIENT_REVERIFIED_ONLY") return "client-reverified-only";
  return "experience-fix-required";
}

/**
 * Candidate-bound runtime evidence is deliberately empty in source control.
 * A historical report or an old evidence directory cannot make the current
 * commit runtime-ready. CI/runtime verification may prove a candidate, but the
 * proof remains external evidence until a governed same-commit evidence record
 * is explicitly bound to that candidate.
 *
 * Static implementation facts (operations/runtimeBound) remain visible so
 * diagnostics can distinguish "implemented but not proven on this candidate"
 * from "not implemented" without manufacturing a PASS.
 */
export const DSH_RUNTIME_MAP: readonly DshRuntimeBinding[] = DSH_CAPABILITIES.map(
  (capability): DshRuntimeBinding => ({
    capabilityId: capability.id,
    contractOperations: capability.contractOperations,
    backendImplemented: capability.contractOperations.length > 0,
    runtimeEvidence: null,
    runtimeEvidenceCommitSha: null,
    evidenceState: "NONE",
    state: unresolvedState(capability),
    runtimeBound: capability.runtimeBound,
    screensReady: false,
    databaseReady: false,
    generatedClientReady: false,
    sharedBrainReady: false,
    surfaceBindingApproved: false,
  }),
);
