import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("UnifiedReadinessWrapper fails closed when DSH readiness is loading or unavailable", async () => {
  const source = await read("apps/app-field/runtime/src/App.tsx");

  const wrapperMatch = source.match(/function UnifiedReadinessWrapper[\s\S]+?function AppContent/);
  assert.ok(wrapperMatch, "UnifiedReadinessWrapper should exist");
  const wrapperCode = wrapperMatch[0];

  assert.doesNotMatch(wrapperCode, /return null;/);
  assert.match(wrapperCode, /<ActivityIndicator/);
  assert.match(wrapperCode, /setReadiness\(null\)/);
  assert.match(wrapperCode, /let active = true/);
  assert.match(wrapperCode, /if \(active\) setReadiness\(gate\)/);
  assert.match(wrapperCode, /if \(active\) setUnavailable\(true\)/);
  assert.match(wrapperCode, /readinessRefreshToken/);
  assert.match(wrapperCode, /fetchFieldOperationalReadiness/);
  assert.match(wrapperCode, /if \(unavailable\)/);
  assert.match(wrapperCode, /ReadinessGateScreen/);
  assert.match(wrapperCode, /if \(!readiness\.ready\)/);
  assert.match(wrapperCode, /return <>{children}<\/>;/);
  assert.match(wrapperCode, /\.catch\(\(\) =>/);
  assert.doesNotMatch(wrapperCode, /blockerReasons|ELIGIBILITY_UNAVAILABLE|fetchWorkforceReadiness/);
});
