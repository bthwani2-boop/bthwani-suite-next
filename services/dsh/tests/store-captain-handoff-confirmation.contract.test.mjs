import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

test("partner handoff confirmation is one durable command with canonical replay", () => {
  const attempt = read("services/dsh/frontend/shared/orders/store-captain-handoff-confirmation-attempt.ts");
  const controller = read("services/dsh/frontend/shared/orders/use-partner-order-commands.ts");
  const api = read("services/dsh/frontend/shared/orders/orders.api.ts");
  const domain = read("services/dsh/backend/internal/dispatch/store_captain_handoff.go");
  const receipt = read("services/dsh/backend/internal/dispatch/store_captain_handoff_command_receipts.go");
  const handler = read("services/dsh/backend/internal/http/store_captain_handoff.go");
  const migration = read("services/dsh/database/migrations/dsh-1069_store_captain_handoff_command_receipts.sql");
  const contract = read("services/dsh/contracts/dsh.runtime-extensions.openapi.yaml");

  assert.match(attempt, /getOrCreateDurableMutationAttempt/);
  assert.match(attempt, /purgeExactDurableMutationAttempt/);
  assert.match(controller, /getOrCreateStoreCaptainHandoffConfirmationAttempt/);
  assert.match(controller, /clearStoreCaptainHandoffConfirmationAttempt/);
  assert.match(controller, /confirmStoreCaptainHandoff\(orderId, attempt\.context\)/);
  assert.match(api, /mutation: DshCaptainCommandContext/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.match(domain, /beginStoreCaptainHandoffConfirmationCommand/);
  assert.match(domain, /recordStoreCaptainHandoffConfirmationCommand/);
  assert.match(receipt, /pg_advisory_xact_lock/);
  assert.match(handler, /requireCaptainCommandIdentity/);
  assert.match(migration, /PRIMARY KEY \(operator_context_id, idempotency_key\)/);
  assert.match(contract, /captain-handoff\/confirm:[\s\S]*?X-Correlation-ID/);
});
