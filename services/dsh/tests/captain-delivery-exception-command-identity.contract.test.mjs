import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

test("Captain delivery exceptions use one durable command identity end to end", () => {
  const attempt = read("services/dsh/frontend/shared/delivery/captain-delivery-exception-command-attempt.ts");
  const runtime = read("services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts");
  const api = read("services/dsh/frontend/shared/dispatch/dispatch.api.ts");
  const domain = read("services/dsh/backend/internal/dispatch/delivery_exceptions.go");
  const handoff = read("services/dsh/backend/internal/dispatch/store_captain_handoff_exceptions.go");
  const handler = read("services/dsh/backend/internal/http/dispatch.go");
  const migration = read("services/dsh/database/migrations/dsh-001_canonical_baseline.sql");
  const contract = read("services/dsh/contracts/paths/dispatch.paths.yaml");

  assert.match(attempt, /getOrCreateDurableMutationAttempt/);
  assert.match(attempt, /purgeExactDurableMutationAttempt/);
  assert.match(attempt, /idempotencyKey/);
  assert.match(runtime, /getOrCreateCaptainDeliveryExceptionCommandAttempt/);
  assert.match(runtime, /clearCaptainDeliveryExceptionCommandAttempt/);
  assert.match(runtime, /reportDeliveryException\(assignmentId, input, attempt\.context\)/);
  assert.match(api, /mutation: DshCaptainCommandContext/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.match(domain, /getDeliveryExceptionByIdempotencyKeyTx/);
  assert.match(domain, /idempotency_key/);
  assert.match(handoff, /input\.IdempotencyKey/);
  assert.match(handler, /requireCaptainCommandIdentity/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /uq_dsh_delivery_exceptions_idempotency/);
  assert.match(contract, /assignments\/\{assignmentId\}\/exceptions:[\s\S]*?CorrelationId/);
});
