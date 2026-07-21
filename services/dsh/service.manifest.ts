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

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  runtimeState: "PARTIALLY_BOUND",
  closureState: "FIX_REQUIRED",
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
    backendRuntimeReady: true,
    generatedClientReady: false,
    generatedClientReason:
      "The primary and catalog generated clients are registered; every active shard still requires registry and CI subset verification on the same commit.",
    databaseReady: true,
    screensReady: false,
    technicalRuntimeReady: false,
    realExperienceReady: false,
    platformControlRuntimeState: "VERIFICATION_REQUIRED",
    platformControlReason:
      "core/platform-control governed changes, live health, progressive rollout, audit, and rollback are implemented; same-commit runtime and independent release evidence remain required.",
  },
} as const;
