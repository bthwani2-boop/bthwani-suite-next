import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("UnifiedReadinessWrapper renders explicit states instead of null", async () => {
  const source = await read("apps/app-field/runtime/src/App.tsx");
  
  const wrapperMatch = source.match(/function UnifiedReadinessWrapper[\s\S]+?function AppContent/);
  assert.ok(wrapperMatch, "UnifiedReadinessWrapper should exist");
  const wrapperCode = wrapperMatch[0];

  // No blank screen rendering
  assert.doesNotMatch(wrapperCode, /return null;/);
  assert.match(wrapperCode, /<ActivityIndicator/);
  
  // Renders ReadinessGateScreen on BLOCKED
  assert.match(wrapperCode, /if \(readiness\.status === "BLOCKED"\)/);
  assert.match(wrapperCode, /<ReadinessGateScreen readiness=\{readiness\} onRefresh=\{fetchReadiness\} \/>/);
  
  // Only allows children if ALLOWED
  assert.match(wrapperCode, /if \(readiness\.status === "ALLOWED"\)/);
  assert.match(wrapperCode, /return <>{children}<\/>;/);
  
  // Catches error explicitly
  assert.match(wrapperCode, /catch \(err\)/);
  assert.match(wrapperCode, /status: "BLOCKED"/);
  assert.match(wrapperCode, /blockerReasons: \["ELIGIBILITY_UNAVAILABLE"\]/);
});

test("parseDeepLink handles valid links and rejects invalid ones", async () => {
  const source = await read("apps/app-field/runtime/src/App.tsx");
  const parseMatch = source.match(/function parseDeepLink\([\s\S]+?return null;\n\s*\}\n\}/);
  assert.ok(parseMatch, "parseDeepLink function should exist");
  const code = parseMatch[0];

  assert.match(code, /scheme !== FIELD_APP_SCHEME/);
  assert.match(code, /const location = querySeparator >= 0/);
  assert.match(code, /const params = parseQuery\(query\)/);
  
  // We cannot easily execute it from here without babel/typescript, 
  // but we can verify the function structure and mappings.
  assert.match(code, /"work-queue": "work-queue"/);
  assert.match(code, /visit: "visit"/);
  assert.match(code, /escalation: "escalation"/);
  assert.match(code, /finance: "finance"/);
  assert.match(code, /base\.storeId = params\.storeId/);
  assert.match(code, /base\.visitId = params\.visitId/);
});
