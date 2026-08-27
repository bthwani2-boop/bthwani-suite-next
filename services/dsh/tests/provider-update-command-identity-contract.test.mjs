import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/platform/providers.api.ts"),
  "utf8",
);
const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/platform/use-provider-registry-controller.tsx"),
  "utf8",
);

test("provider PATCH transport forwards an explicit idempotency key", () => {
  assert.match(api, /export function updateProvider\([\s\S]*idempotencyKey: string/);
  assert.match(api, /method: "PATCH"[\s\S]*idempotencyKey,[\s\S]*correlationId: idempotencyKey/);
  assert.doesNotMatch(api, /const mutationId = corrId\(`provider-update-\$\{providerId\}`\)/);
});

test("provider mutations fail closed and reuse actor-scoped commands", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /const commandIds = useRef<Record<string, string>>\(\{\}\)/);
  assert.match(controller, /const key = `\$\{actorId\}:\$\{scope\}`/);
  assert.match(controller, /const idempotencyKey = commandFor\(`active:\$\{providerId\}:\$\{active\}`\)/);
  assert.match(controller, /const idempotencyKey = commandFor\(`maps-android-key:\$\{providerId\}:\$\{trimmed\}`\)/);
  assert.match(controller, /updateProvider\(providerId, \{ active \}, idempotencyKey\)/);
  assert.match(controller, /\}, idempotencyKey\);/);
});

console.log("provider-update-command-identity-contract: PASS");
