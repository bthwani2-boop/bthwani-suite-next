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
    | "RUNTIME_VERIFIED";
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
  },
  {
    id: "dsh.client.home-discovery",
    status: "runtime-verified",
    contractOperations: ["getDshHomeDiscovery"],
    surfaces: ["app-client"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
  },
] as const satisfies readonly DshCapability[];
