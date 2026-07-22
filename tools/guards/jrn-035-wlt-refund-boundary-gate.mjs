import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "jrn-035-wlt-refund-boundary-gate";
const violations = [];

const required = (file, patterns) => {
  const content = read(file);
  for (const [pattern, message] of patterns) {
    if (!pattern.test(content)) violations.push({ file, line: 0, message });
  }
  return content;
};

const forbidden = (file, patterns) => {
  const content = read(file);
  for (const [pattern, message] of patterns) {
    const match = pattern.exec(content);
    if (match) violations.push({ file, line: lineNumber(content, match.index), message });
  }
  return content;
};

const wltCore = required("services/wlt/backend/internal/refund/governed_refund.go", [
  [/status='processing'/, "WLT_REFUND_PROVIDER_CLAIM_MISSING"],
  [/providerIdempotencyKey/, "WLT_REFUND_PROVIDER_IDEMPOTENCY_MISSING"],
  [/PostLedgerTransaction/, "WLT_REFUND_LEDGER_POSTING_MISSING"],
  [/dshoutbox\.EnqueueRefund/, "WLT_REFUND_DSH_OUTBOX_MISSING"],
  [/ErrRefundProviderUnknown/, "WLT_REFUND_UNKNOWN_RESULT_STATE_MISSING"],
]);
if (!/platform_payable[\s\S]*provider_clearing/.test(wltCore)) {
  violations.push({ file: "services/wlt/backend/internal/refund/governed_refund.go", line: 0, message: "WLT_REFUND_BALANCED_ACCOUNT_PAIR_MISSING" });
}

required("services/wlt/backend/internal/refund/governed_refund_durable_completion.go", [
  [/CompleteGovernedRefundWithProviderDurable/, "WLT_REFUND_DURABLE_COMPLETION_MISSING"],
  [/ErrRefundOutcomePersistence/, "WLT_REFUND_OUTCOME_PERSISTENCE_ERROR_MISSING"],
  [/REFUND_OUTCOME_PERSISTENCE_FAILED/, "WLT_REFUND_OUTCOME_HTTP_ERROR_MISSING"],
]);

required("services/wlt/backend/internal/refund/mutation_idempotency.go", [
  [/RequireMutationIdempotency/, "WLT_REFUND_MUTATION_RECEIPT_MISSING"],
  [/requestHash/, "WLT_REFUND_MUTATION_HASH_MISSING"],
  [/IDEMPOTENCY_CONFLICT/, "WLT_REFUND_CHANGED_PAYLOAD_CONFLICT_MISSING"],
  [/IDEMPOTENCY_IN_PROGRESS/, "WLT_REFUND_IN_PROGRESS_CONFLICT_MISSING"],
  [/X-Idempotent-Replay/, "WLT_REFUND_REPLAY_MARKER_MISSING"],
]);

const router = required("services/wlt/backend/internal/http/server.go", [
  [/HandleCompleteGovernedRefundDurable/, "WLT_REFUND_DURABLE_HANDLER_NOT_BOUND"],
]);
for (const operation of ["create", "approve", "reject", "complete", "reconcile"]) {
  if (!router.includes(`RequireMutationIdempotency(db, "${operation}"`)) {
    violations.push({ file: "services/wlt/backend/internal/http/server.go", line: 0, message: `WLT_REFUND_IDEMPOTENCY_ROUTE_MISSING ${operation}` });
  }
}

required("services/wlt/database/migrations/wlt-037_jrn_035_refund_governance.sql", [
  [/wlt_refund_audit_events/, "WLT_REFUND_AUDIT_SCHEMA_MISSING"],
  [/wlt_dsh_outbox_events_refund_event_idx/, "WLT_REFUND_OUTBOX_IDENTITY_MISSING"],
  [/wlt_refunds_maker_checker_chk/, "WLT_REFUND_MAKER_CHECKER_CONSTRAINT_MISSING"],
]);
required("services/wlt/database/migrations/wlt-092_jrn_035_refund_operation_idempotency.sql", [
  [/wlt_refund_operation_receipts/, "WLT_REFUND_RECEIPT_SCHEMA_MISSING"],
  [/tenant_id, operation, request_path, idempotency_key/, "WLT_REFUND_RECEIPT_IDENTITY_MISSING"],
  [/response_status/, "WLT_REFUND_RECEIPT_RESPONSE_STATUS_MISSING"],
  [/response_body/, "WLT_REFUND_RECEIPT_RESPONSE_BODY_MISSING"],
]);

const dshProxyFiles = [
  "services/dsh/backend/internal/wlt/refund_proxy.go",
  "services/dsh/backend/internal/http/refund_finance_handlers.go",
  "services/dsh/backend/internal/http/refund_finance_routes.go",
];
for (const file of dshProxyFiles) {
  forbidden(file, [
    [/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+)?wlt_(?:refunds|ledger|reconciliation|dsh_outbox)/i, "DSH_DIRECT_WLT_FINANCIAL_TABLE_MUTATION"],
    [/\/financial\/(?:card|telecom|electricity|common)/i, "DSH_DIRECT_FINANCIAL_PROVIDER_ACCESS"],
    [/WLT_FINANCIAL_PROVIDER_BASE_URL/i, "DSH_FINANCIAL_PROVIDER_CONFIGURATION_ACCESS"],
  ]);
}

required("services/dsh/backend/internal/wlt/refund_proxy.go", [
  [/Idempotency-Key/, "DSH_REFUND_IDEMPOTENCY_FORWARDING_MISSING"],
  [/X-Tenant-ID/, "DSH_REFUND_TENANT_FORWARDING_MISSING"],
  [/FinanceRefundWrite/, "DSH_REFUND_WLT_WRITE_ALLOWLIST_MISSING"],
]);
required("services/dsh/backend/internal/http/refund_finance_handlers.go", [
  [/requiredPaymentTenant/, "DSH_REFUND_CANONICAL_TENANT_LOOKUP_MISSING"],
  [/privacyRefund/, "DSH_REFUND_PRIVACY_PROJECTION_MISSING"],
  [/FinancePermissionManage/, "DSH_REFUND_FINANCE_AUTHORITY_MISSING"],
]);

for (const file of listCodeFiles()) {
  if (!file.startsWith("services/dsh/frontend/")) continue;
  if (file.includes("/tests/") || file.includes(".test.") || file.includes(".spec.")) continue;
  forbidden(file, [
    [/WLT_FINANCIAL_PROVIDER_BASE_URL/i, "FRONTEND_FINANCIAL_PROVIDER_CONFIGURATION_ACCESS"],
    [/\/financial\/(?:card|telecom|electricity|common)/i, "FRONTEND_DIRECT_FINANCIAL_PROVIDER_ACCESS"],
    [/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+)?wlt_/i, "FRONTEND_DIRECT_WLT_TABLE_MUTATION"],
  ]);
}

const privacySource = read("services/dsh/backend/internal/http/refund_finance_handlers.go");
const privacyMatch = privacySource.match(/type privacyRefund struct \{([\s\S]*?)\n\}/);
if (!privacyMatch) {
  violations.push({ file: "services/dsh/backend/internal/http/refund_finance_handlers.go", line: 0, message: "DSH_REFUND_PRIVACY_SCHEMA_MISSING" });
} else if (/provider|operator/i.test(privacyMatch[1])) {
  violations.push({ file: "services/dsh/backend/internal/http/refund_finance_handlers.go", line: 0, message: "DSH_REFUND_PRIVACY_SCHEMA_LEAKS_FINANCIAL_EVIDENCE" });
}

fail(guardId, violations);
