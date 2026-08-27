import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/marketing/store-publication.api.ts"),
  "utf8",
);
const panel = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/control-panel/marketing/components/StorePublicationCommandPanel.tsx"),
  "utf8",
);

test("store publication transport forwards an explicit idempotency key", () => {
  assert.match(api, /export async function decideStorePublication\([\s\S]*idempotencyKey: string/);
  assert.match(api, /method: "POST"[\s\S]*idempotencyKey,[\s\S]*correlationId: idempotencyKey/);
  assert.doesNotMatch(api, /corrId\("store-publication-(?:idem|corr)"\)/);
});

test("store publication decisions fail closed and reuse actor-scoped commands", () => {
  assert.match(panel, /const identity = useIdentitySession\(\)/);
  assert.match(panel, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(panel, /const commandIds = useRef<Record<string, string>>\(\{\}\)/);
  assert.match(panel, /const key = `\$\{actorId\}:\$\{scope\}`/);
  assert.match(panel, /if \(!actorId\) \{[\s\S]*PROVIDERS_UNAUTHENTICATED/);
  assert.match(panel, /const idempotencyKey = commandFor\(`\$\{normalizedStoreId\}:\$\{workspace\.store\.version\}:\$\{decision\}/);
  assert.match(panel, /decideStorePublication\(normalizedStoreId, \{[\s\S]*\}, idempotencyKey\)/);
});

console.log("store-publication-command-identity-contract: PASS");
