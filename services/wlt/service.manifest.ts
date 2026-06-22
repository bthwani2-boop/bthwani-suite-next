export const wltServiceManifest = {
  service: "wlt",
  id: "wlt",
  name: "Wallet / Financial Truth",

  realService: true,
  activatesService: true,

  type: "FINANCIAL_PLATFORM_SERVICE",
  lifecycle: "ACTIVE",
  runtimeState: "WLT_000_FOUNDATION_RUNTIME_VERIFIED",

  ownsFinancialTruth: true,

  backendRuntimeReady: true,
  databaseReady: true,
  generatedClientReady: false,
  frontendReady: true,
  frontendDshBoundaryReady: true,

  // WLT-000 Foundation: reference-only endpoints RUNTIME_VERIFIED (slice:gate PASS, evidence: services/wlt/evidence/WLT-000-runtime-foundation/)
  // WLT-001+ mutation APIs: NOT_APPROVED_YET — requires separate approval before implementation
  referenceRuntimeVerified: true,
  sliceRuntimeVerified: true,
  mutationRuntimeReady: false,
  mutationSlicesApproved: false,

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
      "payment_status_reference",
      "settlement_status_reference",
      "refund_status_reference"
    ]
  }
} as const;

export default wltServiceManifest;
