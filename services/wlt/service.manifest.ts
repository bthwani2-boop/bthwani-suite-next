export const wltServiceManifest = {
  service: "wlt",
  id: "wlt",
  name: "Wallet / Financial Truth",

  realService: true,
  activatesService: true,

  type: "FINANCIAL_PLATFORM_SERVICE",
  lifecycle: "ACTIVE",

  ownsFinancialTruth: true,

  contracts: [
    "contracts/wlt.openapi.yaml",
  ],

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

