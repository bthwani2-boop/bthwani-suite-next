import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain readiness API exposes a DSH-owned start-work decision", async () => {
  const api = await read("services/dsh/frontend/app-captain/captain-readiness.api.ts");

  assert.match(api, /export type CaptainOperationalReadiness/);
  assert.match(api, /ready: boolean/);
  assert.match(api, /missing: readonly string\[\]/);
  assert.match(api, /fetchCaptainOperationalReadiness/);
  assert.match(api, /\/dsh\/captain\/me\/readiness/);
  assert.match(api, /Dependency outages reject the request/);
  assert.doesNotMatch(api, /ELIGIBILITY_UNAVAILABLE|blockerReasons/);
});
