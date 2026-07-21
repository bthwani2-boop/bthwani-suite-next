export const DSH_CONTRACT_CLIENT_STRATEGIES = [
  "PRIMARY_GENERATED",
  "SECONDARY_GENERATED_SUBSET",
  "PARENT_GENERATED_SUBSET",
  "MANUAL_TYPED_ADAPTER",
  "STANDALONE_MANUAL_TYPED_ADAPTER",
] as const;

export type DshContractClientStrategy =
  (typeof DSH_CONTRACT_CLIENT_STRATEGIES)[number];

export type DshContractRegistration = {
  readonly id:
    | "dsh-main"
    | "dsh-catalog"
    | "dsh-catalog-proposal-readback"
    | "dsh-catalog-governance"
    | "dsh-marketing-commercial"
    | "dsh-partner-commercial"
    | "dsh-partner-fleet"
    | "dsh-home-marketing-governance"
    | "dsh-home-marketing-events"
    | "dsh-client-address"
    | "dsh-client-map"
    | "dsh-platform-policies"
    | "dsh-partner-support"
    | "dsh-support-governance";
  readonly path: string;
  readonly state: "CONTRACT_ACTIVE";
  readonly runtimeDependency: boolean;
  readonly clientStrategy: DshContractClientStrategy;
  readonly generatedClient?: string;
  readonly adapterOwner?: string;
};

/**
 * Every active DSH OpenAPI document must be registered here exactly once.
 *
 * Subset strategies mean that every shard operation must also exist in the
 * primary contract. A secondary generated subset may additionally own a
 * specialized generated type surface. Manual adapters are allowed only when
 * the contract declares generation disabled and names the adapter explicitly.
 * A standalone manual adapter owns operations that are intentionally not part
 * of the primary generated client; those operations are still included in the
 * canonical capability-ownership and drift checks.
 */
export const DSH_CONTRACT_REGISTRY = [
  {
    id: "dsh-main",
    path: "contracts/dsh.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "PRIMARY_GENERATED",
    generatedClient: "clients/generated/dsh-api.ts",
  },
  {
    id: "dsh-catalog",
    path: "contracts/dsh.catalog.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "SECONDARY_GENERATED_SUBSET",
    generatedClient: "clients/generated/dsh-catalog-api.ts",
  },
  {
    id: "dsh-catalog-proposal-readback",
    path: "contracts/dsh.catalog-proposal-readback.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/catalog/product-proposal-readback.api.ts",
  },
  {
    id: "dsh-catalog-governance",
    path: "contracts/dsh.catalog-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/catalog/catalog-governance.api.ts",
  },
  {
    id: "dsh-marketing-commercial",
    path: "contracts/dsh.marketing-commercial.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/marketing",
  },
  {
    id: "dsh-partner-commercial",
    path: "contracts/dsh.partner-commercial-closure.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "PARENT_GENERATED_SUBSET",
    generatedClient: "clients/generated/dsh-api.ts",
  },
  {
    id: "dsh-partner-fleet",
    path: "contracts/dsh.partner-fleet.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/partner-fleet",
  },
  {
    id: "dsh-home-marketing-governance",
    path: "contracts/dsh.home-marketing-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "PARENT_GENERATED_SUBSET",
    generatedClient: "clients/generated/dsh-api.ts",
  },
  {
    id: "dsh-home-marketing-events",
    path: "contracts/dsh.home-marketing-events.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/home-discovery",
  },
  {
    id: "dsh-client-address",
    path: "contracts/dsh.client-address.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/client-address",
  },
  {
    id: "dsh-client-map",
    path: "contracts/dsh.client-map.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/client-map",
  },
  {
    id: "dsh-platform-policies",
    path: "contracts/dsh.platform-policies.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/platform",
  },
  {
    id: "dsh-partner-support",
    path: "contracts/dsh.partner-support.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support",
  },
  {
    id: "dsh-support-governance",
    path: "contracts/dsh.support-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support",
  },
] as const satisfies readonly DshContractRegistration[];
