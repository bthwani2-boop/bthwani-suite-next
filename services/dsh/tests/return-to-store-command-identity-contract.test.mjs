import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"), "utf8");
const captainScreen = readFileSync(resolve(process.cwd(), "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx"), "utf8");
const partnerController = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/use-partner-return-to-store-controller.ts"), "utf8");

test("return-to-store transport consumes one explicit command identity", () => {
  assert.match(api, /arriveCaptainReturnToStore\([\s\S]*?mutation: DshCaptainCommandContext/);
  assert.match(api, /acceptPartnerReturnToStore\([\s\S]*?mutation: DshCaptainCommandContext/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
});

test("captain and partner return flows use canonical replay-safe transitions", () => {
  assert.match(captainScreen, /const identity = useIdentitySession\(\)/);
  assert.match(captainScreen, /getOrCreateReturnToStoreCommandAttempt/);
  assert.match(captainScreen, /clearReturnToStoreCommandAttempt/);
  assert.match(captainScreen, /arriveCaptainReturnToStore\(assignmentId, attempt\.context\)/);
  assert.match(partnerController, /const identity = useIdentitySession\(\)/);
  assert.match(partnerController, /getOrCreateReturnToStoreCommandAttempt/);
  assert.match(partnerController, /clearReturnToStoreCommandAttempt/);
  assert.match(partnerController, /acceptPartnerReturnToStore\(orderId, attempt\.context\)/);
});

console.log("return-to-store-command-identity-contract: PASS");
