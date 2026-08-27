import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce-me.api.ts"), "utf8");
const provider = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/use-workforce-profile.tsx"), "utf8");

test("workforce self-profile updates require the authenticated actor", () => {
  assert.match(provider, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(provider, /if \(!actorId\) return \{ kind: "unauthenticated" \}/);
  assert.match(provider, /const updateCommandRef = useRef/);
});

test("workforce self-profile transport receives a stable idempotency key", () => {
  assert.match(api, /updateWorkforceMeSelf\(input: UpdateSelfInput, idempotencyKey\?: string\)/);
  assert.match(api, /method: "PATCH", body: input, idempotencyKey/);
  assert.match(provider, /updateWorkforceMeSelf\(input, command\.id\)/);
  assert.match(provider, /const inputKey = JSON\.stringify\(input\)/);
});

console.log("workforce-profile-command-contract: PASS");
