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
  ],

  implementationReadiness: {
    backend: true,
    database: false,
    generatedClient: true,
    frontend: true,
    frontendDshBoundary: true,
    paymentSessionReference: true,
    trustedOperatorContextServiceBoundary: true,
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
      "clients/generated/wlt-api.ts regenerates byte-identical to the committed file from contracts/generated/wlt.bundle.openapi.yaml (verified 2026-08-06; `pnpm run openapi:generate` produces zero diff), so generatedClient is proven. Database migration, reference, mutation, reconciliation, operator-context-isolation, and cross-service journeys still require fresh same-commit runtime evidence this static file cannot provide.",
  },

  productionReadiness: {
    productionMutationsReady: false,
    productionProviderDefaultEnabled: false,
    blocker:
      "Production provider mutations remain unconditionally fail-closed: WLT_ALLOW_PRODUCTION_PROVIDER alone cannot enable them. Production requires an implemented approved provider adapter, secret reference, provider inquiry, verified webhook handling, reconciliation, independent finance/security/release approvals, operator-context isolation, and same-commit runtime evidence.",
  },

  // Compatibility fields are deliberately evidence-safe. Static source or
  // simulator configuration must not promote runtime or financial readiness.
  backendRuntimeReady: false,
  databaseReady: false,
  generatedClientReady: true,
  frontendReady: true,
  frontendDshBoundaryReady: true,
  referenceRuntimeVerified: false,
  journeyRuntimeVerified: false,
  paymentSessionReferenceReady: true,
  trustedOperatorContextServiceBoundaryReady: true,
  localSimulatorMutationsReady: false,
  stagingProviderLabMutationsReady: false,
  productionMutationsReady: false,
  productionMutationBlocker:
    "Production provider mutations remain unconditionally fail-closed until an approved provider adapter and same-commit independent evidence exist; WLT_ALLOW_PRODUCTION_PROVIDER alone is insufficient.",
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
      "captain_funded_cod_reservations",
      "cod_finalization",
      "ledger",
      "reconciliation",
      "finance_reports",
      "audit_references",
      "trusted_financial_operator_context",
    ],
    forbiddenOutsideWlt: [
      "wallet_balance_mutation",
      "payment_confirmation",
      "refund_finalization",
      "settlement_posting",
      "ledger_entry_mutation",
      "payout_decision_mutation",
      "commission_finalization",
      "unauthenticated_financial_reference_read",
      "client_asserted_financial_operator_context_ownership",
    ],
    allowedForDsh: [
      "wlt_reference",
      "payment_session_reference",
      "payment_status_reference",
      "settlement_status_reference",
      "refund_status_reference",
      "trusted_operator_context_scoped_reference_read",
    ],
  },
} as const;

export default wltServiceManifest;
