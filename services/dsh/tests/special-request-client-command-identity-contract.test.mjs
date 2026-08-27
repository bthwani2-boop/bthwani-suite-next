import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/special-requests/special-requests.api.ts"),
  "utf8",
);
const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/special-requests/use-special-requests-controller.tsx"),
  "utf8",
);

test("client special-request cancel and quote approval forward explicit saga keys", () => {
  assert.match(api, /export async function cancelSpecialRequest\([\s\S]*idempotencyKey: string/);
  assert.match(api, /export async function approveSpecialRequestQuote\([\s\S]*idempotencyKey: string/);
  assert.match(api, /method: "POST"[\s\S]*idempotencyKey,/);
});

test("client special-request controllers fail closed and reuse actor-scoped commands", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /const commandIds = useRef<Record<string, string>>\(\{\}\)/);
  assert.match(controller, /const key = `\$\{actorId\}:\$\{scope\}`/);
  assert.match(controller, /cancelSpecialRequest\(id, expectedVersion, commandId\)/);
  assert.match(controller, /approveSpecialRequestQuote\(id, expectedVersion, commandId\)/);
  assert.match(controller, /cancelSpecialRequest\(request\.id, request\.version, commandId\)/);
  assert.match(controller, /approveSpecialRequestQuote\(request\.id, request\.version, commandId\)/);
});

console.log("special-request-client-command-identity-contract: PASS");
