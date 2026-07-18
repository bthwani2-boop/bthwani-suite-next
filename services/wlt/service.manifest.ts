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

  implementationReadiness: {
    backend: true,
    database: true,
    generatedClient: true,
    frontend: true,
    frontendDshBoundary: true,
    paymentSessionReference: true,
    localSimulatorMutations: true,
    stagingProviderLabMutations: true,
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
      "Implementation exists, but reference, mutation, reconciliation, and cross-service journeys require fresh same-commit runtime evidence.",
  },

  productionReadiness: {
    productionMutationsReady: false,
    productionProviderDefaultEnabled: false,
    blocker:
      "Production provider mutations remain fail-closed unless WLT_ALLOW_PRODUCTION_PROVIDER is explicitly true and independent finance, security, release, and same-commit runtime evidence are complete.",
  },

  // Compatibility fields remain deliberately evidence-safe. They must not be
  // promoted independently from runtimeEvidence and productionReadiness.
  backendRuntimeReady: true,
  databaseReady: true,
  generatedClientReady: true,
  frontendReady: true,
  frontendDshBoundaryReady: true,
  referenceRuntimeVerified: false,
  journeyRuntimeVerified: false,
  paymentSessionReferenceReady: true,
  localSimulatorMutationsReady: true,
  stagingProviderLabMutationsReady: true,
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
      "cod_financial_state",
      "ledger",
      "reconciliation",
      "finance_reports",
      "audit_references",
    ],
    forbiddenOutsideWlt: [
      "wallet_balance_mutation",
      "payment_confirmation",
      "refund_finalization",
      "settlement_posting",
      "ledger_entry_mutation",
      "payout_decision_mutation",
      "commission_finalization",
    ],
    allowedForDsh: [
      "wlt_reference",
      "payment_session_reference",
      "payment_status_reference",
      "settlement_status_reference",
      "refund_status_reference",
    ],
  },
} as const;

export default wltServiceManifest;
