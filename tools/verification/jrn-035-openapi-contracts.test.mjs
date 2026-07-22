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

test("WLT refund contract exposes the complete governed lifecycle", () => {
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
    "OutcomePersistenceFailure:",
    "amountMinorUnits:",
    "minimum: 0",
  ], "WLT refund OpenAPI");
  const complete = operationSection(contract, "/wlt/refunds/{refundId}/complete", "/wlt/refunds/{refundId}/reconcile");
  assert.match(complete, /'202':/);
  assert.match(complete, /'500': \{ \$ref: '#\/components\/responses\/OutcomePersistenceFailure' \}/);
  assert.match(complete, /automatic provider retry is forbidden|must not be called again/i);
});

test("DSH refund contract binds command, client and partner surfaces", () => {
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
    "OutcomePersistenceFailure:",
  ], "DSH refund OpenAPI");
  const complete = operationSection(contract, "/dsh/control-panel/finance/refunds/{refundId}/complete", "/dsh/control-panel/finance/refunds/{refundId}/reconcile");
  assert.match(complete, /'202':/);
  assert.match(complete, /'500': \{ \$ref: '#\/components\/responses\/OutcomePersistenceFailure' \}/);
  assert.match(complete, /preserves the WLT status|must not cause another provider call/i);
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
