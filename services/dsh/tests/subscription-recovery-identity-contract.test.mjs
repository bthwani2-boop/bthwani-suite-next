import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "services/dsh/frontend/shared/marketing/use-subscription-lifecycle-controller.tsx",
  "utf8",
);

test("subscription recovery is gated by authenticated actor identity", () => {
  const gate = source.indexOf('if (!actorId)');
  const recovery = source.indexOf('recoverDshSubscriptionPurchase(actorId)');
  const cleanup = source.indexOf('clearSubscriptionMutationAttempts(actorId)');

  assert.ok(gate >= 0, "the lifecycle effect must have an explicit actor gate");
  assert.ok(recovery > gate, "recovery must occur after the actor gate");
  assert.ok(cleanup > gate, "session-end cleanup must occur after the actor gate");
  assert.match(source, /Identity restoration and signed-out states are not allowed/);
});
