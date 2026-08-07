import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("native provider apps use the direct Workforce readiness transport", async () => {
  const [fieldApp, captainApp, nativeWorkforce] = await Promise.all([
    read("apps/app-field/runtime/src/App.tsx"),
    read("apps/app-captain/runtime/src/App.tsx"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  for (const source of [fieldApp, captainApp]) {
    assert.match(source, /workforce-me\.api/);
    assert.match(source, /fetchWorkforceReadiness/);
    assert.doesNotMatch(source, /getReadinessGate/);
    assert.doesNotMatch(source, /workforce\.api";/);
  }

  assert.match(nativeWorkforce, /resolveWorkforceApiBaseUrl\(\)/);
  assert.match(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
