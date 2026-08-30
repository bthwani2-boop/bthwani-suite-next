import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

test("captain availability is one durable DSH command with canonical readback", () => {
  const attempt = read("services/dsh/frontend/shared/delivery/captain-availability-attempt.ts");
  const model = read("services/dsh/frontend/shared/delivery/captain-availability.model.ts");
  const api = read("services/dsh/frontend/shared/dispatch/dispatch.api.ts");
  const backend = read("services/dsh/backend/internal/dispatch/captain_availability.go");
  const handler = read("services/dsh/backend/internal/http/captain_availability.go");
  const migration = read("services/dsh/database/migrations/dsh-1062_captain_availability_command_receipts.sql");

  assert.match(attempt, /getOrCreateDurableMutationAttempt/);
  assert.match(attempt, /resolveMutationIdentityScope/);
  assert.match(attempt, /secureRandomId/);
  assert.match(attempt, /secureCorrelationId/);
  assert.match(attempt, /purgeExactDurableMutationAttempt/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.match(api, /readback\.status !== status/);
  assert.match(model, /getOrCreateCaptainAvailabilityAttempt/);
  assert.match(model, /clearCaptainAvailabilityAttempt/);
  assert.match(model, /Replay the exact durable command identity/);
  assert.doesNotMatch(model, /if \(!availabilityMutationReady.*return/);
  assert.match(backend, /dsh_captain_availability_command_receipts/);
  assert.match(backend, /pg_advisory_xact_lock/);
  assert.match(backend, /ErrIdempotencyConflict/);
  assert.match(handler, /Idempotency-Key/);
  assert.match(handler, /X-Correlation-ID/);
  assert.match(migration, /PRIMARY KEY \(operator_context_id, actor_id, idempotency_key\)/);
  assert.match(migration, /FOREIGN KEY \(operator_context_id, captain_id\)/);
});
