import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/use-dispatch-controller.ts"),
  "utf8",
);
const runtime = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts"),
  "utf8",
);
const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
  "utf8",
);

test("captain dispatch controllers require authenticated identity and reuse scoped commands", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /const scopedKey = `\$\{actorId \?\? "anonymous"\}:\$\{key\}`/);
  assert.match(controller, /acceptDispatchAssignment\(assignmentId, command\.id\)/);
  assert.match(controller, /declineDispatchAssignment\(assignmentId, reason, "captain_declined", command\.id\)/);
  assert.match(controller, /submitPoD\(assignmentId, input, command\.id\)/);
});

test("parallel captain runtime uses the same actor-scoped command registry", () => {
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
