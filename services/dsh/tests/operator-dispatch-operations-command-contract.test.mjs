import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const operations = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/operations/use-dispatch-operations.ts"),
  "utf8",
);
const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
  "utf8",
);

test("operator dispatch operations fail closed without actor identity", () => {
  assert.match(operations, /const identity = useIdentitySession\(\)/);
  assert.match(operations, /const actorId = identity\.state\.kind === 'authenticated'/);
  assert.match(operations, /if \(!actorId\) throw new Error\('جلسة العمليات غير جاهزة لتنفيذ عملية الإسناد/);
  assert.match(operations, /const scopedKey = `\$\{actorId\}:\$\{key\}`/);
});

test("operator cancellation and expiry forward stable idempotency keys", () => {
  assert.match(operations, /expireDispatchAssignments\(200, command\.id\)/);
  assert.match(operations, /cancelDispatchAssignment\(assignmentId, 'OPERATOR_CANCELLED', normalizedReason, command\.id\)/);
  assert.match(api, /cancelDispatchAssignment\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /expireDispatchAssignments\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("operator-dispatch-cancel"\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("operator-dispatch-expire"\)/);
});

console.log("operator-dispatch-operations-command-contract: PASS");
