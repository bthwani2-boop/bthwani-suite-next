import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain app uses the canonical DSH readiness boundary", async () => {
  const [captainApp, captainPublicApi, captainDispatchApi, nativeWorkforce] = await Promise.all([
    read("apps/app-captain/runtime/src/App.tsx"),
    read("services/dsh/frontend/app-captain/index.ts"),
    read("services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  assert.match(captainApp, /from "@bthwani\/dsh\/app-captain"/);
  assert.match(captainApp, /fetchCaptainOperationalReadiness/);
  assert.doesNotMatch(captainApp, /workforce-me\.api|fetchWorkforceReadiness|getReadinessGate/);

  assert.match(captainPublicApi, /fetchOwnCaptainReadiness as fetchCaptainOperationalReadiness/);
  assert.match(captainDispatchApi, /\/dsh\/captain\/me\/readiness/);
  assert.match(captainDispatchApi, /createDshHttpClient/);
  assert.doesNotMatch(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
