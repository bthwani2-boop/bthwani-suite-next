import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("Identity session hydration starts from one deterministic snapshot", async () => {
  const hook = await read("core/identity/clients/use-identity-session.ts");

  assert.match(hook, /const identityHydrationState = \{ kind: ["']restoring["'] \} as const/);
  assert.match(
    hook,
    /useSyncExternalStore\(\s*subscribeIdentityState,\s*getIdentityState,\s*getIdentityHydrationState/s,
  );
  assert.doesNotMatch(
    hook,
    /useSyncExternalStore\(\s*subscribeIdentityState,\s*getIdentityState,\s*getIdentityState/s,
  );
});
