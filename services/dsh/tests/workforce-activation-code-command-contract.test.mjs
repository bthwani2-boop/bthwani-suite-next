import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce.api.ts"), "utf8");
const controller = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-controllers.ts"), "utf8");

test("activation-code transport accepts explicit idempotency keys", () => {
  assert.match(api, /issueFieldAgentActivationCode\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /issueCaptainActivationCode\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /revokeFieldAgentActivationCodes\(actorId: string, idempotencyKey\?: string\)/);
  assert.match(api, /revokeCaptainActivationCodes\(actorId: string, idempotencyKey\?: string\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("wf-activation-field"\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("wf-activation-captain"\)/);
});

test("all Workforce activation consumers use the shared command registry", () => {
  assert.match(controller, /commandFor\("issueCode", expectedVersion, ""\)/);
  assert.match(controller, /issueFieldAgentActivationCode\(actorId, expectedVersion, command\.id\)/);
  assert.match(controller, /issueCaptainActivationCode\(actorId, expectedVersion, command\.id\)/);
  assert.match(controller, /commandFor\("revokeCodes", 0, ""\)/);
  assert.match(controller, /revokeFieldAgentActivationCodes\(actorId, command\.id\)/);
  assert.match(controller, /revokeCaptainActivationCodes\(actorId, command\.id\)/);
  assert.match(controller, /issueFieldAgentActivationCode\(actorId, detail\.version, command\.id\)/);
  assert.match(controller, /revokeFieldAgentActivationCodes\(actorId, command\.id\)/);
});

console.log("workforce-activation-code-command-contract: PASS");
