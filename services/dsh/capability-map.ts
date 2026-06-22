export const DSH_CAPABILITY_STATUS = [
  "contract-active",
  "planned",
  "blocked-runtime",
  "runtime-verified",
] as const;

export type DshCapabilityStatus = (typeof DSH_CAPABILITY_STATUS)[number];

export type DshCapability = {
  readonly id: "dsh.system.readiness" | "dsh.store.discovery" | "dsh.client.home-discovery";
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
    | "CLIENT_REVERIFIED_ONLY"
    | "CONTROL_PANEL_NOT_STARTED"
    | "TOPIC_CLOSURE_NOT_APPROVED";
  readonly topic?: "stores";
  readonly topicScope?: readonly (
    | "discovery"
    | "governance"
    | "readiness"
    | "verification"
    | "pickup-context"
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
] as const satisfies readonly DshCapability[];
