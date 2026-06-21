import { DSH_CAPABILITY_MAP } from "./capability-map";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  stage: "PHASE-10A_DSH_SERVICE_ACTIVATION",
  activationScope: "system-contract",
  contract: "contracts/dsh.openapi.yaml",
  contractState: "CONTRACT_ACTIVE",
  capabilities: DSH_CAPABILITY_MAP,
  surfaces: DSH_SURFACE_MAP,
  runtime: DSH_RUNTIME_MAP,
  currentTruth: {
    contractOperations: [
      "getDshHealth",
      "getDshReadiness",
      "listDshStores",
      "getDshStore",
    ],
    backendRuntimeReady: false,
    generatedClientReady: false,
    databaseReady: false,
    screensReady: false,
  },
  nextSlice: {
    id: "DSH-001",
    name: "Store Discovery",
    closureState: "NOT_APPROVED_YET",
  },
  boundaries: {
    ownsOperationalCommerceTruth: true,
    ownsFinancialTruth: false,
    financialOwner: "wlt",
  },
} as const;

export type DshServiceManifest = typeof dshServiceManifest;
