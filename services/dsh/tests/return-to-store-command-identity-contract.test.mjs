import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/dispatch.api.ts"), "utf8");
const captainScreen = readFileSync(resolve(process.cwd(), "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx"), "utf8");
const partnerController = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/use-partner-return-to-store-controller.ts"), "utf8");

test("return-to-store transport does not advertise an unconsumed idempotency authority", () => {
  assert.match(api, /arriveCaptainReturnToStore\(assignmentId: string\)/);
  assert.match(api, /acceptPartnerReturnToStore\(orderId: string\)/);
  assert.doesNotMatch(api, /captain-return-arrive|partner-return-accept/);
});

test("captain and partner return flows use canonical replay-safe transitions", () => {
  assert.match(captainScreen, /const identity = useIdentitySession\(\)/);
  assert.match(captainScreen, /arriveCaptainReturnToStore\(assignmentId\)/);
  assert.doesNotMatch(captainScreen, /returnCommandRef|captain-return-arrive/);
  assert.match(partnerController, /const identity = useIdentitySession\(\)/);
  assert.match(partnerController, /acceptPartnerReturnToStore\(orderId\)/);
  assert.doesNotMatch(partnerController, /commandRef|Date\.now|partner-return-accept/);
});

console.log("return-to-store-command-identity-contract: PASS");
