import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"), "utf8");
const captainScreen = readFileSync(resolve(process.cwd(), "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx"), "utf8");
const partnerController = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/use-partner-return-to-store-controller.ts"), "utf8");

test("return-to-store transport accepts explicit idempotency keys", () => {
  assert.match(api, /arriveCaptainReturnToStore\(assignmentId: string, idempotencyKey\?: string\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("captain-return-arrive"\)/);
  assert.match(api, /acceptPartnerReturnToStore\(orderId: string, idempotencyKey\?: string\)/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("partner-return-accept"\)/);
});

test("captain and partner return flows preserve actor-scoped command identities", () => {
  assert.match(captainScreen, /const identity = useIdentitySession\(\)/);
  assert.match(captainScreen, /returnCommandRef/);
  assert.match(captainScreen, /arriveCaptainReturnToStore\(assignmentId, command\.id\)/);
  assert.match(partnerController, /const identity = useIdentitySession\(\)/);
  assert.match(partnerController, /commandRef/);
  assert.match(partnerController, /acceptPartnerReturnToStore\(orderId, command\.id\)/);
});

console.log("return-to-store-command-identity-contract: PASS");
