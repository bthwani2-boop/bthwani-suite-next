import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain app uses the direct Workforce readiness transport", async () => {
  const [captainApp, nativeWorkforce] = await Promise.all([
    read("apps/app-captain/runtime/src/App.tsx"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  assert.match(captainApp, /workforce-me\.api/);
  assert.match(captainApp, /fetchWorkforceReadiness/);
  assert.doesNotMatch(captainApp, /getReadinessGate/);
  assert.doesNotMatch(captainApp, /workforce\.api";/);

  assert.match(nativeWorkforce, /resolveWorkforceApiBaseUrl\(\)/);
  assert.match(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
