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

  assert.ok(gate >= 0, "the lifecycle effect must have an explicit actor gate");
  assert.ok(recovery > gate, "recovery must occur after the actor gate");
  assert.doesNotMatch(source, /registerIdentityBeforeSessionEndHook/);
  assert.doesNotMatch(source, /clearSubscriptionMutationAttempts/);
  assert.match(source, /Identity restoration and signed-out states are not allowed/);
});
