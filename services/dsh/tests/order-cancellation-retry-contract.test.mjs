import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/orders/use-order-cancellation-controller.tsx"),
  "utf8",
);
const attempt = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/orders/order-cancellation-attempt.ts"),
  "utf8",
);
const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/orders/order-cancellation.api.ts"),
  "utf8",
);

test("order cancellation retries use the durable actor-scoped command owner", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /executeDurableOrderCancellation\(\{/);
  assert.doesNotMatch(controller, /commandIds|useRef|corrId/);
  assert.match(attempt, /getOrCreateDurableMutationAttempt\(\{/);
  assert.match(attempt, /response\.cancellation\.correlationId !== attempt\.correlationId/);
  assert.match(attempt, /clearOrderCancellationAttempt\(normalized, attempt\.signature\)/);
});

test("order cancellation transport requires the canonical command and correlation", () => {
  assert.match(api, /input: CanonicalCancelOrderInput/);
  assert.match(api, /if \(!commandId \|\| !correlationId\)/);
  assert.doesNotMatch(api, /corrId|commandId\?\.trim\(\) \|\|/);
});

console.log("order-cancellation-retry-contract: PASS");
