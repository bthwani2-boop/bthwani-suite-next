import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const runtime = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts"),
  "utf8",
);
const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
  "utf8",
);

test("canonical captain runtime requires authenticated identity and reuses actor-scoped commands", () => {
  assert.match(runtime, /const identity = useIdentitySession\(\)/);
  assert.match(runtime, /getOrCreateCaptainAssignmentCommandAttempt/);
  assert.match(runtime, /acceptDispatchAssignment\(assignmentId, attempt\.context\)/);
  assert.match(runtime, /declineDispatchAssignment\(assignmentId, normalizedReason, attempt\.context, 'captain_declined'\)/);
  assert.match(runtime, /clearCaptainAssignmentCommandAttempt\(intent, attempt\.signature\)/);
});

test("dispatch transport forwards explicit idempotency keys", () => {
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.match(api, /updateDeliveryStatus\([\s\S]*mutation: DshCaptainCommandContext/);
});

console.log("captain-dispatch-command-identity-contract: PASS");
