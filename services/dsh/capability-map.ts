export const DSH_CAPABILITY_STATUS = [
  "contract-active",
  "planned",
  "blocked-runtime",
  "runtime-verified",
  "experience-fix-required",
] as const;

export type DshCapabilityStatus = (typeof DSH_CAPABILITY_STATUS)[number];

export type DshCapability = {
  readonly id:
    | "dsh.system.readiness"
    | "dsh.store.discovery"
    | "dsh.client.home-discovery"
    | "dsh.client.catalog";
  readonly status: DshCapabilityStatus;
  readonly contractOperations: readonly string[];
  readonly surfaces: readonly string[];
  readonly runtimeBound: boolean;
  readonly relatedFutureSurfaces?: readonly DshSurfaceDependency[];
  readonly relatedFutureCapabilities?: readonly string[];
  readonly closureState:
    | "CONTRACT_ACTIVE_RUNTIME_BLOCKED"
    | "NOT_APPROVED_YET"
    | "RUNTIME_VERIFIED"
    | "FIX_REQUIRED"
    | "CLIENT_REVERIFIED_ONLY"
    | "CONTROL_PANEL_NOT_STARTED"
    | "TOPIC_CLOSURE_NOT_APPROVED"
    | "IMPLEMENTED_MULTI_SURFACE";
  readonly topic?: "stores" | "catalog";
  readonly topicScope?: readonly (
    | "discovery"
    | "governance"
    | "readiness"
    | "verification"
    | "pickup-context"
    | "browse"
    | "partner-manage"
    | "operator-govern"
  )[];
};

export type DshSurfaceDependency =
  | "app-partner"
  | "app-field"
  | "app-captain";

export const DSH_CAPABILITY_MAP = [
  {
    id: "dsh.system.readiness",
    status: "runtime-verified",
    contractOperations: ["getDshHealth", "getDshReadiness"],
    surfaces: [],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
  },
  {
    id: "dsh.store.discovery",
    status: "runtime-verified",
    contractOperations: ["listDshStores", "getDshStore"],
    surfaces: [
      "app-client",
      "control-panel",
      "app-partner",
      "app-field",
      "app-captain",
    ],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "stores",
    topicScope: ["discovery", "governance", "readiness", "verification", "pickup-context"],
  },
  {
    id: "dsh.client.home-discovery",
    status: "planned",
    contractOperations: ["getDshHomeDiscovery"],
    surfaces: ["app-client"],
    runtimeBound: true,
    closureState: "CLIENT_REVERIFIED_ONLY",
  },
  {
    id: "dsh.client.catalog",
    status: "runtime-verified",
    contractOperations: [
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
    surfaces: ["app-client", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "IMPLEMENTED_MULTI_SURFACE",
    topic: "catalog",
    topicScope: ["browse", "partner-manage", "operator-govern"],
  },
] as const satisfies readonly DshCapability[];
