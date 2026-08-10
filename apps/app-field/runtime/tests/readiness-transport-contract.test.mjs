import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("field app uses the direct Workforce readiness transport", async () => {
  const [fieldApp, nativeWorkforce] = await Promise.all([
    read("apps/app-field/runtime/src/App.tsx"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  assert.match(fieldApp, /workforce-me\.api/);
  assert.match(fieldApp, /fetchWorkforceReadiness/);
  assert.doesNotMatch(fieldApp, /getReadinessGate/);
  assert.doesNotMatch(fieldApp, /workforce\.api";/);

  assert.match(nativeWorkforce, /resolveWorkforceApiBaseUrl\(\)/);
  assert.match(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
