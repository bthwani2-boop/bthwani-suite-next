import {
  DSH_CAPABILITIES,
  DSH_CAPABILITY_IDS,
  DSH_CONTRACT_OPERATIONS,
} from "./capabilities";
import { DSH_CONTRACT_REGISTRY } from "./contracts/contract-registry";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

const primaryContract = DSH_CONTRACT_REGISTRY.find(
  (contract) => contract.clientStrategy === "PRIMARY_GENERATED",
);

if (!primaryContract) {
  throw new Error("DSH_PRIMARY_CONTRACT_MISSING");
}

const sameCommitRuntimeEvidenceReady = DSH_RUNTIME_MAP.every(
  (binding) => binding.evidenceState === "SAME_COMMIT_VERIFIED",
);
const backendImplementationPresent = DSH_RUNTIME_MAP.every(
  (binding) => binding.backendImplemented,
);
const backendRuntimeReady =
  sameCommitRuntimeEvidenceReady && DSH_RUNTIME_MAP.every((binding) => binding.runtimeBound);
const generatedClientReady =
  sameCommitRuntimeEvidenceReady && DSH_RUNTIME_MAP.every((binding) => binding.generatedClientReady);
const databaseReady =
  sameCommitRuntimeEvidenceReady && DSH_RUNTIME_MAP.every((binding) => binding.databaseReady);
const screensReady =
  sameCommitRuntimeEvidenceReady && DSH_RUNTIME_MAP.every((binding) => binding.screensReady);
const sharedBrainReady =
  sameCommitRuntimeEvidenceReady && DSH_RUNTIME_MAP.every((binding) => binding.sharedBrainReady);
const surfaceBindingApproved =
  sameCommitRuntimeEvidenceReady && DSH_RUNTIME_MAP.every((binding) => binding.surfaceBindingApproved);
const technicalRuntimeReady =
  backendRuntimeReady && generatedClientReady && databaseReady && sharedBrainReady;
const realExperienceReady = technicalRuntimeReady && screensReady && surfaceBindingApproved;

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  runtimeState: realExperienceReady ? "RUNTIME_VERIFIED" : "PARTIALLY_BOUND",
  closureState: realExperienceReady ? "RUNTIME_VERIFIED" : "FIX_REQUIRED",
  activationScope:
    "stores-home-discovery-catalog-cart-checkout-wlt-handoff-orders-dispatch-field-readiness-support-analytics-notifications-finance-special-requests-pickup-partner-delivery",
  contract: primaryContract.path,
  contracts: DSH_CONTRACT_REGISTRY.map((contract) => contract.path),
  contractRegistry: DSH_CONTRACT_REGISTRY,
  contractState: "CONTRACT_ACTIVE",
  capabilityIds: DSH_CAPABILITY_IDS,
  capabilities: DSH_CAPABILITIES,
  surfaces: DSH_SURFACE_MAP,
  runtime: DSH_RUNTIME_MAP,
  currentTruth: {
    contractOperations: DSH_CONTRACT_OPERATIONS,
    backendImplementationPresent,
    sameCommitRuntimeEvidenceReady,
    backendRuntimeReady,
    generatedClientReady,
    generatedClientReason: generatedClientReady
      ? "Every active generated client shard is verified on the same candidate."
      : "Generated clients may be present, but current-candidate registry/CI evidence is required before readiness is true.",
    databaseReady,
    screensReady,
    sharedBrainReady,
    surfaceBindingApproved,
    technicalRuntimeReady,
    realExperienceReady,
    platformControlRuntimeState: "VERIFICATION_REQUIRED",
    platformControlReason:
      "core/platform-control governed changes, live health, progressive rollout, audit, and rollback are implemented; same-commit runtime and independent release evidence remain required.",
  },
} as const;
