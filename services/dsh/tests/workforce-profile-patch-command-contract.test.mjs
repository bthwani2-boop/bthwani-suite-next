import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce.api.ts"), "utf8");
const providers = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-controllers.ts"), "utf8");
const employees = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-employee-controllers.ts"), "utf8");

test("workforce profile PATCH APIs accept idempotency keys", () => {
  assert.match(api, /updateFieldAgent\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /updateCaptain\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /updateEmployee\([\s\S]*idempotencyKey\?: string/);
});

test("all workforce profile PATCH consumers forward stable command IDs", () => {
  assert.match(providers, /updateFieldAgent\(actorId, input, command\.id\)/);
  assert.match(providers, /updateCaptain\(actorId, input, command\.id\)/);
  assert.match(employees, /updateEmployee\(actorId, input, command\.id\)/);
  assert.match(providers, /commandFor\("update", 0, JSON\.stringify\(input\)/);
  assert.match(employees, /commandFor\("update", 0, JSON\.stringify\(input\)/);
});

console.log("workforce-profile-patch-command-contract: PASS");
