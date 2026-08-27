import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/partner-delivery/use-partner-delivery-controller.tsx"),
  "utf8",
);

test("partner-delivery actions require authenticated identity before mutation", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /if \(!actorId\) \{[\s\S]*جلسة موصل المتجر غير جاهزة لتنفيذ العملية/);
  assert.match(controller, /if \(!actorId\) \{[\s\S]*جلسة العمليات غير جاهزة لتنفيذ الاستثناء/);
});

test("partner-delivery command registries include the authenticated actor", () => {
  assert.match(controller, /const scopedKey = `\$\{actorId \?\? "anonymous"\}:\$\{key\}`/);
  assert.match(controller, /const commandKey = `\$\{actorId\}:\$\{orderIdValue\}/);
  assert.match(controller, /delete commandIds\.current\[`\$\{actorId\}:\$\{actionKey\}`\]/);
});

console.log("partner-delivery-command-identity-contract: PASS");
