import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce.api.ts"), "utf8");
const providers = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-controllers.ts"), "utf8");
const employees = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-employee-controllers.ts"), "utf8");

test("workforce status transitions forward explicit idempotency keys", () => {
  assert.match(api, /suspendFieldAgent\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /reactivateFieldAgent\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /suspendCaptain\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /reactivateCaptain\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /suspendEmployee\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /reactivateEmployee\([\s\S]*idempotencyKey\?: string/);
});

test("provider and employee controllers bind transitions to the authenticated operator", () => {
  assert.match(providers, /function useWorkforceMutationCommands/);
  assert.match(providers, /const operatorActorId = identity\.state\.kind === "authenticated"/);
  assert.match(providers, /suspendFieldAgent\(actorId, expectedVersion, reason, command\.id\)/);
  assert.match(providers, /reactivateCaptain\(actorId, expectedVersion, reason, command\.id\)/);
  assert.match(employees, /function useEmployeeMutationCommands/);
  assert.match(employees, /const operatorActorId = identity\.state\.kind === "authenticated"/);
  assert.match(employees, /suspendEmployee\(actorId, expectedVersion, reason, command\.id\)/);
  assert.match(employees, /reactivateEmployee\(actorId, expectedVersion, reason, command\.id\)/);
});

console.log("workforce-status-transition-command-contract: PASS");
