import { DSH_CAPABILITY_MAP } from "./capability-map";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  stage: "DSH-001_RUNTIME_VERIFIED",
  activationScope: "store-discovery-full-stack",
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
    backendRuntimeReady: true,
    generatedClientReady: true,
    databaseReady: true,
    screensReady: true,
  },
  nextSlice: {
    id: "DSH-001",
    name: "Store Discovery",
    closureState: "RUNTIME_VERIFIED",
  },
  boundaries: {
    ownsOperationalCommerceTruth: true,
    ownsFinancialTruth: false,
    financialOwner: "wlt",
  },
} as const;

export type DshServiceManifest = typeof dshServiceManifest;
