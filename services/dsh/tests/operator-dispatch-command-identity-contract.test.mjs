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
  assert.match(screen, /getOrCreateOperatorDeliveryExceptionCommandAttempt/);
  assert.match(screen, /await action\(attempt\.context\)/);
  assert.match(screen, /acknowledgeDeliveryException\(item\.id, item\.version, attempt\.context\)/);
  assert.match(screen, /clearOperatorDeliveryExceptionCommandAttempt\(intent, attempt\.fingerprint\)/);
  assert.match(screen, /if \(!await load\(\)\)/);
  assert.doesNotMatch(screen, /commandIds|operator-dispatch:|Date\.now/);
});

test("exception decisions remove shadow keys while returned-order cancellation stays durable", () => {
  assert.match(api, /acknowledgeDeliveryException\([\s\S]*mutation: DshOperatorCommandContext/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.match(api, /resolveDeliveryExceptionCancelOrder\([\s\S]*mutation: DshOperatorCommandContext/);
  assert.doesNotMatch(api, /operator-delivery-exception-ack|operator-delivery-exception-resolve/);
  assert.doesNotMatch(api, /requiresDeliveryExceptionAcknowledgement/);
  assert.match(screen, /executeDurableOrderCancellation\(\{/);
  assert.match(screen, /ticketReference: `delivery-exception:\$\{item\.id\}`/);
});

console.log("operator-dispatch-command-identity-contract: PASS");
