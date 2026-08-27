import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/pickup/pickup.api.ts"),
  "utf8",
);
const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/pickup/use-pickup-controller.tsx"),
  "utf8",
);

test("partner pickup transport forwards explicit command IDs for every transition", () => {
  for (const functionName of [
    "markPickupReady",
    "notifyPickupCustomer",
    "markPickupCustomerArrived",
    "verifyPickupSession",
    "markPickupNoShow",
    "extendPickupWindowAsPartner",
    "reschedulePickupWindowAsPartner",
  ]) {
    assert.match(api, new RegExp(`export async function ${functionName}\\([\\s\\S]*commandId: string`));
  }
  for (const legacyPrefix of ["pk-ready", "pk-notify", "pk-arrived", "pk-verify", "pk-no-show", "pk-reschedule"]) {
    assert.doesNotMatch(api, new RegExp(`commandId: corrId\\("${legacyPrefix}"\\)`));
  }
});

test("partner pickup controller fails closed and reuses actor-scoped commands on retry", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /const commandIds = useRef<Record<string, string>>\(\{\}\)/);
  assert.match(controller, /const key = `\$\{actorId\}:\$\{orderId\}:\$\{action\}:\$\{fingerprint\}`/);
  assert.match(controller, /if \(!actorId\) \{[\s\S]*جلسة الشريك غير جاهزة لتنفيذ إجراء الاستلام/);
  assert.match(controller, /return runAction\(successMessage, \(\) => execute\(command\.id\)\)/);
  assert.match(controller, /markPickupReady\(orderId, expectedVersion, commandId\)/);
  assert.match(controller, /verifyPickupSession\(orderId, \{ expectedVersion, code \}, commandId\)/);
  assert.match(controller, /reschedulePickupWindowAsPartner\(orderId, \{ expectedVersion, reason: normalizedReason, newExpiry \}, commandId\)/);
});

console.log("pickup-command-identity-contract: PASS");
