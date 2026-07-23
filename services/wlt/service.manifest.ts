export const wltServiceManifest = {
  service: "wlt",
  id: "wlt",
  name: "Wallet / Financial Truth",

  realService: true,
  activatesService: true,

  type: "FINANCIAL_PLATFORM_SERVICE",
  lifecycle: "ACTIVE",
  closureState: "FIX_REQUIRED",
  runtimeState: "IMPLEMENTED_RUNTIME_EVIDENCE_REQUIRED",

  ownsFinancialTruth: true,

  contracts: [
    "contracts/wlt.openapi.yaml",
    "contracts/wlt.saas-reference-auth.overlay.yaml",
  ],

  implementationReadiness: {
    backend: true,
    database: false,
    generatedClient: false,
    frontend: true,
    frontendDshBoundary: true,
    paymentSessionReference: true,
    saasReferenceAuthentication: true,
    trustedTenantServiceBoundary: true,
    localSimulatorMutations: false,
    stagingProviderLabMutations: false,
  },

  runtimeEvidence: {
    evidenceCommitSha: null,
    referenceRuntimeVerified: false,
    journeyRuntimeVerified: false,
    localSimulatorMutationsVerified: false,
    stagingProviderLabMutationsVerified: false,
    productionMutationsVerified: false,
    evidenceState: "NEEDS_EVIDENCE",
    reason:
      "Implementation exists, but database migration, generated/manual clients, reference, mutation, reconciliation, tenant-isolation, and cross-service journeys require fresh same-commit evidence.",
  },

  productionReadiness: {
    productionMutationsReady: false,
    productionProviderDefaultEnabled: false,
    blocker:
      "Production provider mutations remain fail-closed unless WLT_ALLOW_PRODUCTION_PROVIDER is explicitly true and independent finance, security, release, tenant-isolation, and same-commit runtime evidence are complete.",
  },

  // Compatibility fields are deliberately evidence-safe. Static source or
  // simulator configuration must not promote runtime or financial readiness.
  backendRuntimeReady: false,
  databaseReady: false,
  generatedClientReady: false,
  frontendReady: true,
  frontendDshBoundaryReady: true,
  referenceRuntimeVerified: false,
  journeyRuntimeVerified: false,
  paymentSessionReferenceReady: true,
  saasReferenceAuthenticationReady: true,
  trustedTenantServiceBoundaryReady: true,
  localSimulatorMutationsReady: false,
  stagingProviderLabMutationsReady: false,
  productionMutationsReady: false,
  productionMutationBlocker:
    "Production provider mutations remain fail-closed pending explicit provider enablement and same-commit independent evidence.",
  mutationRuntimeReady: false,
  mutationJourneysApproved: false,

  boundaries: {
    owns: [
      "wallets",
      "payment_sessions",
      "refunds",
      "settlements",
      "payout_decisions",
      "commissions",
      "delivery_collection_custody",
      "cod_legacy_compatibility",
      "ledger",
      "reconciliation",
      "finance_reports",
      "audit_references",
      "saas_financial_reference_authentication",
      "trusted_financial_tenant_context",
    ],
    forbiddenOutsideWlt: [
      "wallet_balance_mutation",
      "payment_confirmation",
      "refund_finalization",
      "settlement_posting",
      "ledger_entry_mutation",
      "payout_decision_mutation",
      "commission_finalization",
      "collection_custody_mutation",
      "unauthenticated_financial_reference_read",
      "client_asserted_financial_tenant_ownership",
    ],
    allowedForDsh: [
      "wlt_reference",
      "payment_session_reference",
      "payment_status_reference",
      "settlement_status_reference",
      "refund_status_reference",
      "delivery_collection_reference",
      "trusted_tenant_scoped_reference_read",
    ],
  },
} as const;

export default wltServiceManifest;
