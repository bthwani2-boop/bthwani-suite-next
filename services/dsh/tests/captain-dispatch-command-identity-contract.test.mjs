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
  assert.match(runtime, /const scopedKey = `\$\{actorId\}:\$\{key\}`/);
  assert.match(runtime, /acceptDispatchAssignment\(assignmentId, command\.id\)/);
  assert.match(runtime, /declineDispatchAssignment\(assignmentId, reason, 'captain_declined', command\.id\)/);
  assert.match(runtime, /correlationId: command\.id/);
});

test("dispatch transport forwards explicit idempotency keys", () => {
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("captain-dispatch-accept"\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("captain-dispatch-decline"\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("captain-dispatch-pod"\)/);
  assert.match(api, /body: input, idempotencyKey: input\.correlationId/);
});

console.log("captain-dispatch-command-identity-contract: PASS");
