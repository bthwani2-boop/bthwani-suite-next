import {
  DSH_CAPABILITIES,
  DSH_CAPABILITY_IDS,
  DSH_CONTRACT_OPERATIONS,
} from "./capabilities";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  runtimeState: "PARTIALLY_BOUND",
  closureState: "FIX_REQUIRED",
  activationScope:
    "stores-home-discovery-catalog-cart-checkout-wlt-handoff-orders-dispatch-field-readiness-support-analytics-notifications-finance-special-requests-pickup-partner-delivery",
  contract: "contracts/dsh.openapi.yaml",
  contracts: [
    "contracts/dsh.openapi.yaml",
    "contracts/dsh.catalog.openapi.yaml",
    "contracts/dsh.marketing-commercial.openapi.yaml",
    "contracts/dsh.partner-fleet.openapi.yaml",
  ],
  contractFragments: {
    centralCatalog: "contracts/dsh.catalog.openapi.yaml",
    marketingCommercial: "contracts/dsh.marketing-commercial.openapi.yaml",
    partnerFleet: "contracts/dsh.partner-fleet.openapi.yaml",
  },
  contractState: "CONTRACT_ACTIVE",
  capabilityIds: DSH_CAPABILITY_IDS,
  capabilities: DSH_CAPABILITIES,
  surfaces: DSH_SURFACE_MAP,
  runtime: DSH_RUNTIME_MAP,
  currentTruth: {
    contractOperations: DSH_CONTRACT_OPERATIONS,
    catalogContract: {
      path: "contracts/dsh.catalog.openapi.yaml",
      state: "CONTRACT_ACTIVE",
      optimisticConcurrency: "REQUIRED",
      conflictStatus: 409,
      clientGeneration: "ENABLED",
    },
    backendRuntimeReady: true,
    generatedClientReady: true,
    databaseReady: true,
    screensReady: false,
    technicalRuntimeReady: false,
    realExperienceReady: false,
    platformControlRuntimeState: "VERIFICATION_REQUIRED",
    platformControlReason:
      "core/platform-control P3 governed changes, live health, progressive rollout, audit, and rollback are implemented; same-commit runtime and independent release evidence remain required.",
  },
} as const;
