export const DSH_CAPABILITY_STATUS = [
  "contract-active",
  "planned",
  "blocked-runtime",
] as const;

export type DshCapabilityStatus = (typeof DSH_CAPABILITY_STATUS)[number];

export type DshCapability = {
  readonly id: "dsh.system.readiness" | "dsh.store.discovery";
  readonly status: DshCapabilityStatus;
  readonly contractOperations: readonly string[];
  readonly surfaces: readonly string[];
  readonly runtimeBound: boolean;
  readonly closureState: "CONTRACT_ACTIVE_RUNTIME_BLOCKED" | "NOT_APPROVED_YET";
};

export const DSH_CAPABILITY_MAP = [
  {
    id: "dsh.system.readiness",
    status: "blocked-runtime",
    contractOperations: ["getDshHealth", "getDshReadiness"],
    surfaces: [],
    runtimeBound: false,
    closureState: "CONTRACT_ACTIVE_RUNTIME_BLOCKED",
  },
  {
    id: "dsh.store.discovery",
    status: "contract-active",
    contractOperations: ["listDshStores", "getDshStore"],
    surfaces: ["app-client"],
    runtimeBound: false,
    closureState: "NOT_APPROVED_YET",
  },
] as const satisfies readonly DshCapability[];
