import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("UnifiedReadinessWrapper fails closed across identity changes and stale responses", async () => {
  const source = await read("apps/app-field/runtime/src/App.tsx");

  const wrapperMatch = source.match(/function UnifiedReadinessWrapper[\s\S]+?function AppContent/);
  assert.ok(wrapperMatch, "UnifiedReadinessWrapper should exist");
  const wrapperCode = wrapperMatch[0];

  assert.doesNotMatch(wrapperCode, /return null;/);
  assert.match(wrapperCode, /<ActivityIndicator/);
  assert.match(wrapperCode, /setReadiness\(null\)/);
  assert.match(wrapperCode, /let active = true/);
  assert.match(wrapperCode, /if \(!active\) return/);
  assert.match(wrapperCode, /gate\.actorId !== actorId \|\| gate\.workforceKind !== workforceKind/);
  assert.match(wrapperCode, /readinessRefreshToken/);
  assert.match(wrapperCode, /readiness\?\.actorId === workforce\.state\.me\.actorId/);
  assert.match(wrapperCode, /currentReadiness\.status === "BLOCKED"/);
  assert.match(wrapperCode, /ReadinessGateScreen/);
  assert.match(wrapperCode, /currentReadiness\.status === "ALLOWED"/);
  assert.match(wrapperCode, /return <>{children}<\/>;/);
  assert.match(wrapperCode, /\.catch\(\(\) =>/);
  assert.match(wrapperCode, /status: "BLOCKED"/);
  assert.match(wrapperCode, /blockerReasons: \["ELIGIBILITY_UNAVAILABLE"\]/);
});
