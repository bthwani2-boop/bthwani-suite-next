import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const screen = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx"),
  "utf8",
);
const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
  "utf8",
);

test("operator dispatch decisions require an authenticated actor and stable command map", () => {
  assert.match(screen, /const identity = useIdentitySession\(\)/);
  assert.match(screen, /const actorId = identity\.state\.kind === 'authenticated'/);
  assert.match(screen, /const commandIds = React\.useRef<Record<string, string>>\(\{\}\)/);
  assert.match(screen, /if \(!actorId\) \{[\s\S]*جلسة العمليات غير جاهزة لتنفيذ القرار/);
  assert.match(screen, /await action\(command\.id\)/);
  assert.match(screen, /acknowledgeDeliveryException\(item\.id, item\.version, command\.id\)/);
});

test("operator dispatch resolution transport forwards explicit idempotency keys", () => {
  assert.match(api, /acknowledgeDeliveryException\(id: string, expectedVersion: number, idempotencyKey\?: string\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("operator-delivery-exception-ack"\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("operator-delivery-exception-resolve"\)/);
  assert.match(screen, /commandId: command\.id/);
});

console.log("operator-dispatch-command-identity-contract: PASS");
