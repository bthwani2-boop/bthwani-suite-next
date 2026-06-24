import { DSH_CAPABILITY_MAP } from "./capability-map";
import { DSH_RUNTIME_MAP } from "./runtime-map";
import { DSH_SURFACE_MAP } from "./surface-map";

export const dshServiceManifest = {
  service: "dsh",
  realService: true,
  activatesService: true,
  stage: "DSH-001_RUNTIME_VERIFIED_DSH-002_RUNTIME_VERIFIED_DSH-003_RUNTIME_VERIFIED_DSH-004_SCREENS_IMPLEMENTED_DSH-005_SCREENS_IMPLEMENTED_DSH-006_SCREENS_IMPLEMENTED_DSH-007_SCREENS_IMPLEMENTED_DSH-008_RUNTIME_VERIFIED_DSH-009_RUNTIME_VERIFIED",
  closureState: "RUNTIME_VERIFIED",
  activationScope: "stores-topic-all-surfaces-home-discovery-topic-two-surfaces-catalog-topic-three-surfaces",
  contract: "contracts/dsh.openapi.yaml",
  contractState: "CONTRACT_ACTIVE",
  capabilities: DSH_CAPABILITY_MAP,
  surfaces: DSH_SURFACE_MAP,
  runtime: DSH_RUNTIME_MAP,
  currentTruth: {
    contractOperations: [
      // DSH-001 Store Discovery
      "getDshHealth",
      "getDshReadiness",
      "listDshStores",
      "getDshStore",
      // DSH-002 Home Discovery
      "getDshHomeDiscovery",
      "listOperatorHomeDiscoveryContent",
      "createOperatorHomeDiscoveryContent",
      "updateOperatorHomeDiscoveryContent",
      "deleteOperatorHomeDiscoveryContent",
      "getPublishedDshCatalog",
      "getPartnerDshCatalog",
      "createPartnerCatalogCategory",
      "updatePartnerCatalogCategory",
      "deletePartnerCatalogCategory",
      "createPartnerCatalogProduct",
      "updatePartnerCatalogProduct",
      "deletePartnerCatalogProduct",
      "createPartnerCatalogMediaUploadIntent",
      "completePartnerCatalogMedia",
      "deletePartnerCatalogMedia",
      "submitPartnerCatalog",
      "listOperatorCatalogSubmissions",
      "decideOperatorCatalogSubmission",
      "listOperatorCatalogAudit",
    ],
    backendRuntimeReady: true,
    generatedClientReady: true,
    databaseReady: true,
    screensReady: true,
    technicalRuntimeReady: true,
    realExperienceReady: true,
    sharedOwnershipEnforced: true,
    controllersInShared: [
      "useStoreAdminController",
      "useStoreDiscoveryController",
      "useStoreRoleContextController",
      "useHomeDiscoveryController",
      "useHomeDiscoveryAdminController",
      "usePartnerCatalogController",
      "usePublishedCatalogController",
      "useCatalogApprovalController",
      "useCatalogAuditController",
    ],
    primarySurfaces: [
      "app-client",
      "control-panel",
      "app-partner",
      "app-field",
      "app-captain",
    ],
    requiredStoreRoleSurfaces: ["app-partner", "app-field", "app-captain"],
    incompleteExperienceSurfaces: [],
    crossSurfaceDependencyMap:
      "machine-readable/dsh-wlt/dsh_001_cross_surface_dependency_map.json",
  },
  nextSlice: {
    id: "DSH-004",
    name: "DSH-004 Cart & Serviceability Quote",
    closureState: "NOT_APPROVED_YET",
  },
  boundaries: {
    ownsOperationalCommerceTruth: true,
    ownsFinancialTruth: false,
    financialOwner: "wlt",
  },
} as const;

export type DshServiceManifest = typeof dshServiceManifest;
