import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

test("captain accept and decline commands preserve identity across retries", () => {
  const attempt = read("services/dsh/frontend/shared/delivery/captain-assignment-command-attempt.ts");
  const runtime = read("services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts");
  const api = read("services/dsh/frontend/shared/dispatch/dispatch.api.ts");
  const backend = read("services/dsh/backend/internal/dispatch/captain_assignment_command_receipts.go");
  const handler = read("services/dsh/backend/internal/http/dispatch_governance_handlers.go");
  const migration = read("services/dsh/database/migrations/dsh-1064_captain_assignment_command_receipts.sql");
  const contract = read("services/dsh/contracts/paths/dispatch.paths.yaml");

  assert.match(attempt, /getOrCreateDurableMutationAttempt/);
  assert.match(attempt, /resolveMutationIdentityScope/);
  assert.match(attempt, /purgeExactDurableMutationAttempt/);
  assert.match(runtime, /getOrCreateCaptainAssignmentCommandAttempt/);
  assert.match(runtime, /clearCaptainAssignmentCommandAttempt/);
  assert.match(runtime, /isUncertainCaptainCommandError/);
  assert.match(runtime, /acceptDispatchAssignment\(assignmentId, attempt\.context\)/);
  assert.match(runtime, /declineDispatchAssignment\(assignmentId, normalizedReason, attempt\.context, 'captain_declined'\)/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.match(backend, /dsh_captain_assignment_command_receipts/);
  assert.match(backend, /pg_advisory_xact_lock/);
  assert.match(handler, /requireCaptainCommandIdentity/);
  assert.match(handler, /ReserveCodCapacity\([^\n]+idempotencyKey/);
  assert.match(migration, /PRIMARY KEY \(operator_context_id, actor_id, idempotency_key\)/);
  assert.match(contract, /assignments\/\{assignmentId\}\/accept:[\s\S]*?IdempotencyKey/);
  assert.match(contract, /assignments\/\{assignmentId\}\/decline:[\s\S]*?IdempotencyKey/);
});
