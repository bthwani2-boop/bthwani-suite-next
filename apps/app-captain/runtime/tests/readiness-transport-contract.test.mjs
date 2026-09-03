import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain app uses the canonical DSH readiness boundary", async () => {
  const [runtimeApp, captainApplication, captainPublicApi, captainDispatchApi, nativeWorkforce] = await Promise.all([
    read("apps/app-captain/runtime/src/App.tsx"),
    read("services/dsh/frontend/app-captain/DshCaptainApplication.tsx"),
    read("services/dsh/frontend/app-captain/index.ts"),
    read("services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  assert.match(runtimeApp, /from "@bthwani\/dsh\/app-captain"/);
  assert.match(runtimeApp, /<DshCaptainApplication/);
  assert.doesNotMatch(runtimeApp, /fetchOwnCaptainReadiness|DshOperationalReadinessBoundary|WorkforceAccessGate/);
  assert.match(captainApplication, /fetchOwnCaptainReadiness/);
  assert.match(captainApplication, /DshOperationalReadinessBoundary/);
  assert.match(captainApplication, /<WorkforceProfileProvider>/);

  assert.doesNotMatch(captainPublicApi, /fetch(?:OwnCaptainReadiness|CaptainOperationalReadiness)/);
  assert.match(captainDispatchApi, /\/dsh\/captain\/me\/readiness/);
  assert.match(captainDispatchApi, /createDshHttpClient/);
  assert.doesNotMatch(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
