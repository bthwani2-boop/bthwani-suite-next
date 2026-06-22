import { DSH_CAPABILITY_MAP } from "./capability-map";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  stage: "DSH-001_RUNTIME_VERIFIED_MULTI_SURFACE",
  closureState: "RUNTIME_VERIFIED",
  activationScope: "store-discovery-multi-surface",
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
      "getDshHomeDiscovery",
    ],
    backendRuntimeReady: true,
    generatedClientReady: true,
    databaseReady: true,
    screensReady: true,
    sharedOwnershipEnforced: true,
    controllersInShared: [
      "useStoreAdminController",
      "useStoreDiscoveryController",
      "useStoreRoleContextController",
      "useHomeDiscoveryController",
    ],
    primarySurfaces: [
      "app-client",
      "control-panel",
      "app-partner",
      "app-field",
      "app-captain",
    ],
    storeOnlyRoleSurfaces: ["app-partner", "app-field", "app-captain"],
    crossSurfaceDependencyMap:
      "machine-readable/dsh-wlt/dsh_001_cross_surface_dependency_map.json",
  },
  nextSlice: {
    id: "DSH-002",
    name: "DSH-002 Home Discovery Admin — control-panel",
    closureState: "NOT_APPROVED_YET",
  },
  boundaries: {
    ownsOperationalCommerceTruth: true,
    ownsFinancialTruth: false,
    financialOwner: "wlt",
  },
} as const;

export type DshServiceManifest = typeof dshServiceManifest;
