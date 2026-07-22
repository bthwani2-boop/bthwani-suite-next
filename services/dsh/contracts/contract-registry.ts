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
    | "dsh-administration"
    | "dsh-catalog"
    | "dsh-catalog-proposal-readback"
    | "dsh-catalog-governance"
    | "dsh-client-address-privacy"
    | "dsh-workforce-scopes"
    | "dsh-checkout"
    | "dsh-order-truth"
    | "dsh-partner-onboarding"
    | "dsh-payment-sessions"
    | "dsh-marketing-commercial"
    | "dsh-partner-commercial"
    | "dsh-partner-fleet"
    | "dsh-partner-delivery"
    | "dsh-home-marketing-governance"
    | "dsh-home-marketing-events"
    | "dsh-client-address"
    | "dsh-client-map"
    | "dsh-platform-policies"
    | "dsh-partner-support"
    | "dsh-support-governance"
    | "dsh-notifications-governance"
    | "dsh-incident-governance"
    | "dsh-order-rescue"
    | "dsh-store-captain-handoff"
    | "dsh-dispatch-governance"
    | "dsh-live-tracking"
    | "dsh-delivery-exceptions"
    | "dsh-delivery-proof-media"
    | "dsh-delivery-proof-completion";
  readonly path: string;
  readonly state: "CONTRACT_ACTIVE";
  readonly runtimeDependency: boolean;
  readonly clientStrategy: DshContractClientStrategy;
  readonly generatedClient?: string;
  readonly adapterOwner?: string;
};

/**
 * Every active DSH OpenAPI document is registered here exactly once.
 *
 * Subset strategies mean that every shard operation is represented by the
 * primary generated contract. Standalone manual adapters own active operations
 * outside that primary generated surface while preserving one explicit shared
 * frontend owner and backend route parity.
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
    id: "dsh-administration",
    path: "contracts/dsh.administration.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/administration",
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
    clientStrategy: "MANUAL_TYPED_ADAPTER",
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
    id: "dsh-client-address-privacy",
    path: "contracts/dsh.client-address-privacy.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/privacy",
  },
  {
    id: "dsh-workforce-scopes",
    path: "contracts/dsh.jrn-003-workforce-scopes.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/workforce",
  },
  {
    id: "dsh-checkout",
    path: "contracts/dsh.jrn-010-checkout.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/checkout",
  },
  {
    id: "dsh-order-truth",
    path: "contracts/dsh.order-truth.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/order-truth",
  },
  {
    id: "dsh-partner-onboarding",
    path: "contracts/dsh.partner-onboarding.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/partner",
  },
  {
    id: "dsh-payment-sessions",
    path: "contracts/dsh.payment-sessions.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/finance-wlt-link",
  },
  {
    id: "dsh-marketing-commercial",
    path: "contracts/dsh.marketing-commercial.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/marketing",
  },
  {
    id: "dsh-partner-commercial",
    path: "contracts/dsh.partner-commercial-closure.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/marketing",
  },
  {
    id: "dsh-partner-fleet",
    path: "contracts/dsh.partner-fleet.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/partner/partner-fleet.api.ts",
  },
  {
    id: "dsh-partner-delivery",
    path: "contracts/dsh.partner-delivery.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/partner-delivery",
  },
  {
    id: "dsh-home-marketing-governance",
    path: "contracts/dsh.home-marketing-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/home-discovery",
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
    clientStrategy: "MANUAL_TYPED_ADAPTER",
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
  {
    id: "dsh-notifications-governance",
    path: "contracts/dsh.notifications-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/notifications",
  },
  {
    id: "dsh-incident-governance",
    path: "contracts/dsh.incident-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support/incident-governance.api.ts",
  },
  {
    id: "dsh-order-rescue",
    path: "contracts/dsh.order-rescue.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support/order-rescue.api.ts",
  },
  {
    id: "dsh-store-captain-handoff",
    path: "contracts/dsh.store-captain-handoff.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/orders",
  },
  {
    id: "dsh-dispatch-governance",
    path: "contracts/dsh.dispatch-governance.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/dispatch",
  },
  {
    id: "dsh-live-tracking",
    path: "contracts/dsh.live-tracking.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/dispatch",
  },
  {
    id: "dsh-delivery-exceptions",
    path: "contracts/dsh.delivery-exceptions.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/dispatch/dispatch.api.ts",
  },
  {
    id: "dsh-delivery-proof-media",
    path: "contracts/dsh.delivery-proof-media.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/media/pod/delivery-proof-media.api.ts",
  },
  {
    id: "dsh-delivery-proof-completion",
    path: "contracts/dsh.delivery-proof-completion.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/delivery-proof",
  },
] as const satisfies readonly DshContractRegistration[];
