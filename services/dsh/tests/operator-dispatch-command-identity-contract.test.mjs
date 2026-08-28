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

test("operator dispatch decisions require an authenticated actor and canonical state transitions", () => {
  assert.match(screen, /const identity = useIdentitySession\(\)/);
  assert.match(screen, /const actorId = identity\.state\.kind === 'authenticated'/);
  assert.match(screen, /if \(!actorId\) \{[\s\S]*جلسة العمليات غير جاهزة لتنفيذ القرار/);
  assert.match(screen, /await action\(\)/);
  assert.match(screen, /acknowledgeDeliveryException\(item\.id, item\.version\)/);
  assert.doesNotMatch(screen, /commandIds|operator-dispatch:|Date\.now/);
});

test("exception decisions remove shadow keys while returned-order cancellation stays durable", () => {
  assert.match(api, /acknowledgeDeliveryException\(id: string, expectedVersion: number\)/);
  assert.doesNotMatch(api, /operator-delivery-exception-ack|operator-delivery-exception-resolve/);
  assert.match(screen, /executeDurableOrderCancellation\(\{/);
  assert.match(screen, /ticketReference: `delivery-exception:\$\{item\.id\}`/);
});

console.log("operator-dispatch-command-identity-contract: PASS");
