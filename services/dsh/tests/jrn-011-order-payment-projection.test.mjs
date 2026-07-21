import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const DSH_ROOT = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, DSH_ROOT), "utf8");

test("JRN-011 strengthens future order numbers and schedules WLT reconciliation", () => {
  const migration = read("database/migrations/dsh-905_jrn_011_payment_projection_reconciliation.sql");

  assert.match(migration, /payment_projection_source_updated_at/);
  assert.match(migration, /payment_projection_reconciled_at/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS dsh_order_payment_projection_reconciliation/);
  assert.match(migration, /UNIQUE \(tenant_id, wlt_payment_session_id\)/);
  assert.match(migration, /FOR 12\)\)\)/);
  assert.match(migration, /trg_dsh_jrn011_schedule_payment_projection/);
  assert.match(migration, /payment_status_projection := CASE/);
});

test("DSH reads WLT truth and updates a read-only projection without wallet mutation", () => {
  const client = read("backend/internal/wlt/payment_session.go");
  const worker = read("backend/internal/orders/order_payment_projection_worker.go");
  const main = read("backend/cmd/dsh-api/main.go");

  assert.match(client, /GetPaymentSession/);
  assert.match(client, /"GET", "\/payment-sessions\/"\+sessionID/);
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /GetPaymentSession/);
  assert.match(worker, /payment_projection_source_updated_at/);
  assert.match(worker, /payment_projection_reconciled_at/);
  assert.match(worker, /order\.payment_projection_updated/);
  assert.match(worker, /unsupported WLT payment status/);
  assert.match(main, /go orders\.RunPaymentProjectionWorker/);
  assert.doesNotMatch(worker, /debit|credit|refund\(|settlement/i);
});

test("payment freshness diagnostics use reconciliation time rather than source age", () => {
  const diagnostics = read("backend/internal/orders/order_truth_diagnostics.go");
  assert.match(diagnostics, /payment_projection_reconciled_at IS NULL/);
  assert.match(diagnostics, /ORDER_PAYMENT_PROJECTION_STALE/);
  assert.doesNotMatch(
    diagnostics,
    /COUNT\(\*\) FILTER \(WHERE o\.payment_projection_updated_at IS NULL/,
  );
});
