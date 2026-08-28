import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controller = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-controllers.ts"), "utf8");

test("provider activation consumer forwards stable command IDs for both provider kinds", () => {
  assert.match(controller, /useProviderActivationController\(providerKind: "field" \| "captain", actorId: string\)/);
  assert.match(controller, /const command = mutationCommands\.commandFor\("suspend", detail\.version, reason\)/);
  assert.match(controller, /suspendCaptain\(actorId, detail\.version, reason, command\.id\)/);
  assert.match(controller, /suspendFieldAgent\(actorId, detail\.version, reason, command\.id\)/);
  assert.match(controller, /const command = mutationCommands\.commandFor\("reactivate", detail\.version, reason\)/);
  assert.match(controller, /reactivateCaptain\(actorId, detail\.version, reason, command\.id\)/);
  assert.match(controller, /reactivateFieldAgent\(actorId, detail\.version, reason, command\.id\)/);
});

console.log("workforce-activation-consumer-command-contract: PASS");
