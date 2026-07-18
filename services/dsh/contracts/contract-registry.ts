export const DSH_CONTRACT_CLIENT_STRATEGIES = [
  "PRIMARY_GENERATED",
  "SECONDARY_GENERATED_SUBSET",
  "PARENT_GENERATED_SUBSET",
  "MANUAL_TYPED_ADAPTER",
] as const;

export type DshContractClientStrategy =
  (typeof DSH_CONTRACT_CLIENT_STRATEGIES)[number];

export type DshContractRegistration = {
  readonly id:
    | "dsh-main"
    | "dsh-catalog"
    | "dsh-marketing-commercial"
    | "dsh-partner-commercial"
    | "dsh-partner-fleet"
    | "dsh-home-marketing-governance";
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
] as const satisfies readonly DshContractRegistration[];
