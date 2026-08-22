import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain app uses the canonical DSH readiness boundary", async () => {
  const [captainApp, captainReadinessApi, nativeWorkforce] = await Promise.all([
    read("apps/app-captain/runtime/src/App.tsx"),
    read("services/dsh/frontend/app-captain/captain-readiness.api.ts"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  assert.match(captainApp, /from "@bthwani\/dsh\/app-captain"/);
  assert.match(captainApp, /fetchCaptainOperationalReadiness/);
  assert.doesNotMatch(captainApp, /workforce-me\.api|fetchWorkforceReadiness|getReadinessGate/);

  assert.match(captainReadinessApi, /\/dsh\/captain\/me\/readiness/);
  assert.match(captainReadinessApi, /createDshHttpClient/);
  assert.doesNotMatch(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
