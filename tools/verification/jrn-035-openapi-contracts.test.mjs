import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const wltPath = "services/wlt/contracts/jrn-035-refunds.openapi.yaml";
const dshPath = "services/dsh/contracts/jrn-035-refunds.openapi.yaml";
const read = (path) => readFileSync(path, "utf8");

function requireAll(content, values, label) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} is missing ${value}`);
  }
}

function operationSection(contract, path, nextPath) {
  const start = contract.indexOf(`  ${path}:\n`);
  const end = contract.indexOf(`  ${nextPath}:\n`, start + 1);
  assert.ok(start >= 0 && end > start, `${path} operation boundaries are missing`);
  return contract.slice(start, end);
}

function assertMutationReceiptResponse(contract, path, nextPath) {
  const section = operationSection(contract, path, nextPath);
  assert.match(section, /'500': \{ \$ref: '#\/components\/responses\/(MutationReceiptFailure|CompletionPersistenceFailure)' \}/);
  return section;
}

test("WLT refund contract exposes the complete governed lifecycle and durable mutation replay", () => {
  const contract = read(wltPath);
  requireAll(contract, [
    "operationId: createWltRefund",
    "operationId: listWltRefunds",
    "operationId: getWltRefund",
    "operationId: approveWltRefund",
    "operationId: rejectWltRefund",
    "operationId: completeWltRefund",
    "operationId: reconcileWltRefund",
    "operationId: listWltRefundAudit",
    "name: X-Tenant-ID",
    "name: Idempotency-Key",
    "provider_unknown",
    "PROVIDER_RESULT_UNKNOWN",
    "REFUND_OUTCOME_PERSISTENCE_FAILED",
    "REFUND_IDEMPOTENCY_STORE_FAILED",
    "REFUND_IDEMPOTENCY_RECEIPT_FAILED",
    "MutationReceiptFailure:",
    "CompletionPersistenceFailure:",
    "amountMinorUnits:",
    "minimum: 0",
  ], "WLT refund OpenAPI");
  assertMutationReceiptResponse(contract, "/wlt/refunds", "/wlt/refunds/{refundId}");
  assertMutationReceiptResponse(contract, "/wlt/refunds/{refundId}/approve", "/wlt/refunds/{refundId}/reject");
  assertMutationReceiptResponse(contract, "/wlt/refunds/{refundId}/reject", "/wlt/refunds/{refundId}/complete");
  const complete = assertMutationReceiptResponse(contract, "/wlt/refunds/{refundId}/complete", "/wlt/refunds/{refundId}/reconcile");
  assert.match(complete, /'202':/);
  assert.match(complete, /not retry permission/i);
  assertMutationReceiptResponse(contract, "/wlt/refunds/{refundId}/reconcile", "/wlt/refunds/{refundId}/audit");
});

test("DSH refund contract binds command, client and partner surfaces and preserves WLT failures", () => {
  const contract = read(dshPath);
  requireAll(contract, [
    "operationId: createDshFinanceRefund",
    "operationId: listDshFinanceRefunds",
    "operationId: getDshFinanceRefund",
    "operationId: approveDshFinanceRefund",
    "operationId: rejectDshFinanceRefund",
    "operationId: completeDshFinanceRefund",
    "operationId: reconcileDshFinanceRefund",
    "operationId: listDshFinanceRefundAudit",
    "operationId: getDshClientOrderRefundStatus",
    "operationId: getDshPartnerOrderRefundStatus",
    "/dsh/client/orders/{orderId}/refunds:",
    "/dsh/partner/orders/{orderId}/refunds:",
    "PROVIDER_RESULT_UNKNOWN",
    "REFUND_OUTCOME_PERSISTENCE_FAILED",
    "REFUND_IDEMPOTENCY_STORE_FAILED",
    "REFUND_IDEMPOTENCY_RECEIPT_FAILED",
    "MutationReceiptFailure:",
    "CompletionPersistenceFailure:",
    "authenticated Identity actor",
  ], "DSH refund OpenAPI");
  const tenantHeaderStart = contract.indexOf("    TenantHeader:\n");
  const correlationHeaderStart = contract.indexOf("    CorrelationHeader:\n", tenantHeaderStart + 1);
  assert.ok(tenantHeaderStart >= 0 && correlationHeaderStart > tenantHeaderStart, "TenantHeader parameter boundaries are missing");
  const tenantHeader = contract.slice(tenantHeaderStart, correlationHeaderStart);
  assert.match(tenantHeader, /name: X-Tenant-ID/);
  assert.match(tenantHeader, /required: false/);
  assert.match(tenantHeader, /authoritative tenant[\s\S]*authenticated Identity actor/);
  assert.doesNotMatch(tenantHeader, /required: true/);
  assertMutationReceiptResponse(contract, "/dsh/control-panel/finance/refunds", "/dsh/control-panel/finance/refunds/{refundId}");
  assertMutationReceiptResponse(contract, "/dsh/control-panel/finance/refunds/{refundId}/approve", "/dsh/control-panel/finance/refunds/{refundId}/reject");
  assertMutationReceiptResponse(contract, "/dsh/control-panel/finance/refunds/{refundId}/reject", "/dsh/control-panel/finance/refunds/{refundId}/complete");
  const complete = assertMutationReceiptResponse(contract, "/dsh/control-panel/finance/refunds/{refundId}/complete", "/dsh/control-panel/finance/refunds/{refundId}/reconcile");
  assert.match(complete, /'202':/);
  assert.match(complete, /must not cause another provider call|not retry permission/i);
  assertMutationReceiptResponse(contract, "/dsh/control-panel/finance/refunds/{refundId}/reconcile", "/dsh/control-panel/finance/refunds/{refundId}/audit");
});

test("privacy refund schema excludes provider and operator evidence", () => {
  const contract = read(dshPath);
  const privacyStart = contract.indexOf("    PrivacyRefund:\n");
  const createStart = contract.indexOf("    CreateDshRefundRequest:\n");
  assert.ok(privacyStart >= 0 && createStart > privacyStart, "PrivacyRefund schema boundaries are missing");
  const privacySchema = contract.slice(privacyStart, createStart);
  assert.doesNotMatch(privacySchema, /providerReference|providerStatus|providerError/i);
  assert.doesNotMatch(privacySchema, /requestedByOperatorId|approvedByOperatorId|rejectedByOperatorId/i);
  assert.match(privacySchema, /amountMinorUnits/);
  assert.match(privacySchema, /resolvedAt/);
});
