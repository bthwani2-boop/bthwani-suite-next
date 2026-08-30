import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

test("captain delivery status is one durable DSH command with canonical readback", () => {
  const attempt = read("services/dsh/frontend/shared/delivery/captain-delivery-status-command-attempt.ts");
  const runtime = read("services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts");
  const api = read("services/dsh/frontend/shared/dispatch/dispatch.api.ts");
  const domain = read("services/dsh/backend/internal/dispatch/store_captain_handoff_idempotency.go");
  const receipt = read("services/dsh/backend/internal/dispatch/captain_delivery_command_receipts.go");
  const handler = read("services/dsh/backend/internal/http/store_captain_handoff.go");
  const migration = read("services/dsh/database/migrations/dsh-1066_captain_delivery_status_command_receipts.sql");
  const contract = read("services/dsh/contracts/paths/dispatch.paths.yaml");

  assert.match(attempt, /getOrCreateDurableMutationAttempt/);
  assert.match(attempt, /findDurableMutationAttempts/);
  assert.match(attempt, /findPendingCaptainDeliveryStatusCommandAttempt/);
  assert.match(attempt, /resolveMutationIdentityScope/);
  assert.match(attempt, /purgeExactDurableMutationAttempt/);
  assert.match(runtime, /getOrCreateCaptainDeliveryStatusCommandAttempt/);
  assert.match(runtime, /findPendingCaptainDeliveryStatusCommandAttempt/);
  assert.match(runtime, /captainDeliveryStatusCommandIntentFromAttempt/);
  assert.match(runtime, /clearCaptainDeliveryStatusCommandAttempt/);
  assert.match(runtime, /mutation: attempt\.context/);
  assert.match(api, /readonly mutation: DshCaptainCommandContext/);
  assert.match(api, /idempotencyKey: options\.mutation\.idempotencyKey/);
  assert.match(api, /correlationId: options\.mutation\.correlationId/);
  assert.match(domain, /single Captain delivery-status mutation entry point/);
  assert.match(receipt, /dsh_captain_delivery_status_command_receipts/);
  assert.match(receipt, /pg_advisory_xact_lock/);
  assert.match(handler, /requireCaptainCommandIdentity/);
  assert.match(handler, /correlationID/);
  assert.match(migration, /PRIMARY KEY \(operator_context_id, idempotency_key\)/);
  assert.match(contract, /assignments\/\{assignmentId\}\/status:[\s\S]*?CorrelationId/);
});
