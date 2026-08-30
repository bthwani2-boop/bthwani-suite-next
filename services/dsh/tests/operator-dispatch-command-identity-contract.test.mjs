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
const operations = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/operations/use-dispatch-operations.ts"),
  "utf8",
);
const handler = readFileSync(
  resolve(process.cwd(), "services/dsh/backend/internal/http/dispatch_governance_handlers.go"),
  "utf8",
);
const governanceContract = readFileSync(
  resolve(process.cwd(), "services/dsh/contracts/dsh.dispatch-governance.openapi.yaml"),
  "utf8",
);
const dispatchContract = readFileSync(
  resolve(process.cwd(), "services/dsh/contracts/paths/dispatch.paths.yaml"),
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

test("operator assignment mutations use durable command identity and explicit writes", () => {
  const operatorListStart = handler.indexOf("handleListGovernedOperatorDispatchAssignments");
  const captainListStart = handler.indexOf("handleListGovernedCaptainDispatchAssignments");
  const acceptStart = handler.indexOf("handleAcceptGovernedDispatchAssignment");
  const operatorList = handler.slice(operatorListStart, captainListStart);
  const captainList = handler.slice(captainListStart, acceptStart);
  assert.match(operations, /getOrCreateOperatorDispatchCommandAttempt/);
  assert.match(operations, /executeWithReplay/);
  assert.match(operations, /clearOperatorDispatchCommandAttempt\(intent, attempt\.fingerprint\)/);
  assert.match(operations, /const readback = await load/);
  assert.doesNotMatch(operations, /commandIds|corrId\(|operator-dispatch-(cancel|expire)/);
  assert.match(api, /cancelDispatchAssignment\(/);
  assert.match(api, /expireDispatchAssignments\(/);
  assert.match(api, /mutation: DshOperatorCommandContext/);
  assert.match(api, /correlationId: mutation\.correlationId/);
  assert.doesNotMatch(api, /idempotencyKey \?\?|corrId\("operator-dispatch/);
  assert.match(handler, /requireOperatorCommandIdentity\(w, r\)/);
  assert.match(handler, /CancelGovernedAssignmentIdempotentForOperatorContext/);
  assert.match(handler, /ExpireOverdueAssignmentsIdempotentForOperatorContext/);
  assert.doesNotMatch(operatorList, /ExpireOverdueAssignments/);
  assert.doesNotMatch(captainList, /ExpireOverdueAssignments/);
  assert.match(governanceContract, /name: Idempotency-Key/);
  assert.match(governanceContract, /name: X-Correlation-ID/);
  assert.match(dispatchContract, /operationId: createDshAssignment[\s\S]*IdempotencyKey[\s\S]*CorrelationId/);
});

console.log("operator-dispatch-command-identity-contract: PASS");
