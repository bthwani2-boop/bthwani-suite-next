import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("field app uses the canonical DSH readiness boundary", async () => {
  const [fieldApp, fieldReadinessApi, nativeWorkforce] = await Promise.all([
    read("apps/app-field/runtime/src/App.tsx"),
    read("services/dsh/frontend/app-field/field-operational-readiness.api.ts"),
    read("services/dsh/frontend/shared/workforce/workforce-me.api.ts"),
  ]);

  assert.match(fieldApp, /from "@bthwani\/dsh\/app-field"/);
  assert.match(fieldApp, /fetchFieldOperationalReadiness/);
  assert.doesNotMatch(fieldApp, /workforce-me\.api|fetchWorkforceReadiness|getReadinessGate/);

  assert.match(fieldReadinessApi, /\/dsh\/field\/me\/readiness/);
  assert.match(fieldReadinessApi, /createDshHttpClient/);
  assert.doesNotMatch(nativeWorkforce, /\/workforce\/readiness\/\$\{encodeURIComponent\(actorId\)\}/);
});
