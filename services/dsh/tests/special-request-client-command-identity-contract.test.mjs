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
  assert.match(api, /export type ClientSpecialRequestMutationContext[\s\S]*"idempotencyKey" \| "correlationId"/);
  assert.match(api, /export async function cancelSpecialRequest\([\s\S]*mutation: ClientSpecialRequestMutationContext/);
  assert.match(api, /export async function approveSpecialRequestQuote\([\s\S]*mutation: ClientSpecialRequestMutationContext/);
  assert.match(api, /method: "POST"[\s\S]*idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /correlationId: mutation\.correlationId/);
});

test("client special-request controllers fail closed and reuse actor-scoped commands", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /getOrCreateClientSpecialRequestCommandAttempt/);
  assert.match(controller, /clearClientSpecialRequestCommandAttempt/);
  assert.match(controller, /const attempt = await getOrCreateClientSpecialRequestCommandAttempt\(\{[\s\S]*actorId,[\s\S]*requestId: id,[\s\S]*action: "cancel"/);
  assert.match(controller, /cancelSpecialRequest\(id, expectedVersion, attempt\.context\)/);
  assert.match(controller, /approveSpecialRequestQuote\(id, expectedVersion, attempt\.context\)/);
  assert.match(controller, /cancelSpecialRequest\(request\.id, request\.version, attempt\.context\)/);
  assert.match(controller, /approveSpecialRequestQuote\(request\.id, request\.version, attempt\.context\)/);
  assert.doesNotMatch(controller, /const commandIds = useRef/);
});

console.log("special-request-client-command-identity-contract: PASS");
