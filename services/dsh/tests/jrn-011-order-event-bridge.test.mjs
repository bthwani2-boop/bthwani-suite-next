import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const DSH_ROOT = new URL("../", import.meta.url);
const REPO_ROOT = new URL("../../../", import.meta.url);
const readDsh = (path) => fs.readFileSync(new URL(path, DSH_ROOT), "utf8");
const readRepo = (path) => fs.readFileSync(new URL(path, REPO_ROOT), "utf8");

test("JRN-011 starts a real bridge from order outbox to operational outbox", () => {
  const bridge = readDsh("backend/internal/orders/order_event_bridge_worker.go");
  const main = readDsh("backend/cmd/dsh-api/main.go");

  assert.match(bridge, /ClaimOrderEvents/);
  assert.match(bridge, /INSERT INTO dsh_operational_outbox_events/);
  assert.match(bridge, /VALUES \(\$1::uuid, \$2, 'order'/);
  assert.match(bridge, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(bridge, /MarkOrderEventPublished/);
  assert.match(bridge, /MarkOrderEventRetry/);
  assert.match(main, /go orders\.RunOrderEventBridgeWorker/);
  assert.match(main, /go operationaloutbox\.RunWorker/);
});

test("canonical operational consumer resolves order recipient and emits notification copy", () => {
  const worker = readDsh("backend/internal/operationaloutbox/worker.go");

  assert.match(worker, /case "order":\s+var clientID string/s);
  assert.match(worker, /SELECT client_id::text\s+FROM dsh_orders/s);
  assert.match(worker, /case "order\.created":/);
  assert.match(worker, /تم إنشاء طلبك/);
  assert.match(worker, /actionURL = "\/orders\/" \+ event\.EntityID/);
  assert.match(worker, /ON CONFLICT \(id\) DO NOTHING/);
});

test("JRN-011 runbook treats outbox delivery as an operational obligation", () => {
  const runbook = readRepo("governance/runbooks/jrn-011-order-truth-operations.md");
  assert.match(runbook, /Order event publication lag/);
  assert.match(runbook, /dead letter/i);
  assert.match(runbook, /requeue the same outbox row with its original event ID/i);
});
