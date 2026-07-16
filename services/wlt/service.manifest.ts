export const wltServiceManifest = {
  service: "wlt",
  id: "wlt",
  name: "Wallet / Financial Truth",

  realService: true,
  activatesService: true,

  type: "FINANCIAL_PLATFORM_SERVICE",
  lifecycle: "ACTIVE",
  runtimeState: "WLT_000_FOUNDATION_EVIDENCE_REQUIRED_WLT_001_PAYMENT_SESSION_REFERENCE_ACTIVE",

  ownsFinancialTruth: true,

  backendRuntimeReady: true,
  databaseReady: true,
  generatedClientReady: true,
  frontendReady: true,
  frontendDshBoundaryReady: true,

  // WLT Foundation Foundation: reference-only endpoints require fresh journey-gate and API health evidence at services/wlt/evidence/WLT Foundation-runtime-foundation/.
  // WLT Payment Sessions: minimal payment-session reference create/read is active for DSH handoff.
  // WLT Payment Sessions+ financial mutations are approved for the local/staging
  // provider-lab posture only. Production provider access remains blocked by
  // runtime configuration unless WLT_ALLOW_PRODUCTION_PROVIDER is explicitly true.
  referenceRuntimeVerified: true,
  journeyRuntimeVerified: false,
  paymentSessionReferenceReady: true,
  mutationRuntimeReady: true,
  mutationJourneysApproved: true,

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
      "audit_references"
    ],
    forbiddenOutsideWlt: [
      "wallet_balance_mutation",
      "payment_confirmation",
      "refund_finalization",
      "settlement_posting",
      "ledger_entry_mutation",
      "payout_decision_mutation",
      "commission_finalization"
    ],
    allowedForDsh: [
      "wlt_reference",
      "payment_session_reference",
      "payment_status_reference",
      "settlement_status_reference",
      "refund_status_reference"
    ]
  }
} as const;

export default wltServiceManifest;
