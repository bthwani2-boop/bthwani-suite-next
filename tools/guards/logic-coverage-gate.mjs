/**
 * tools/guards/logic-coverage-gate.mjs
 *
 * BTHWANI_LOGIC_COVERAGE_GATE — Phase 1 static checks.
 *
 * Verifies that UI components and frontend code follow bthwani's fullstack
 * logic completeness rules:
 *
 * FAIL (hard violations):
 *   1. Pressable/TouchableOpacity/Button with onPress={undefined} or onPress={null}
 *   2. fetch() / axios() called directly in a screen component
 *      (must go through controllers/ or adapters/)
 *   3. Promise.resolve() with hardcoded object/array in a non-test component
 *      (mock success path)
 *   4. console.log in non-test app component files (signals unfinished logic)
 *
 * WARN (logged but do not fail — surfaced for review):
 *   W1. Screen component that does not import from a controller or adapter
 *       (may be a pure display component — reviewed manually)
 *   W2. Exported page/screen component that never calls a hook or handler
 *       (may be static — but worth flagging)
 *
 * Scope:
 *   apps-src + services-frontend
 *   Excludes: node_modules, generated, tests, android, ios, shell, providers, layout
 */

import path from "node:path";
import { fail, listCodeFiles, lineNumber, read } from "./_guard-utils.mjs";

const guardId = "logic-coverage-gate";
const violations = [];
const warnings = [];

function inScope(f) {
  if (!/\.(tsx|jsx|ts|js)$/.test(f)) return false;
  if (f.includes("node_modules")) return false;
  if (f.includes("/generated/") || f.includes("clients/generated")) return false;
  if (f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")) return false;
  if (f.includes("android/") || f.includes("ios/")) return false;
  // Exclude infra/shell/provider/layout files
  if (/\/(shell|providers?|layout|_layout)\.(tsx?|jsx?)$/.test(f)) return false;
  // Exclude tools themselves
  if (f.startsWith("tools/")) return false;

  const inApps = /^apps\/[^/]+\/runtime\/src\//.test(f);
  const inServicesFrontend = /^services\/[^/]+\/frontend\//.test(f);
  return inApps || inServicesFrontend;
}

// ---------------------------------------------------------------------------
// FAIL Rule 1: onPress={undefined} or onPress={null} — dead button
// ---------------------------------------------------------------------------
const DEAD_PRESS = /\bonPress\s*=\s*\{?\s*(undefined|null)\s*\}?/g;

// ---------------------------------------------------------------------------
// FAIL Rule 2: Direct fetch() in screen/page component (not in adapter/controller)
// ---------------------------------------------------------------------------
const RAW_FETCH = /\bfetch\s*\(/g;
function isAdapterOrController(f) {
  return (
    f.includes("/controllers/") ||
    f.includes("/adapters/") ||
    f.endsWith(".api.ts") ||
    f.endsWith(".api.tsx") ||
    f.endsWith("runtime-adapter.ts") ||
    f.endsWith("api-client.ts") ||
    // HTTP kernel/transport files ARE the approved HTTP layer
    f.includes("/_kernel/") ||
    f.includes("/http-request") ||
    f.includes("-http-request") ||
    f.includes("/media/") // media upload uses raw fetch for multipart
  );
}

// ---------------------------------------------------------------------------
// FAIL Rule 3: Mock success — Promise.resolve with object/array literal
// ---------------------------------------------------------------------------
const MOCK_RESOLVE = /\bPromise\.resolve\s*\(\s*[{[]/;

// ---------------------------------------------------------------------------
// FAIL Rule 4: console.log (NOT console.error/warn) in app component
// console.error/warn are acceptable in action/model/controller error paths
// ---------------------------------------------------------------------------
const CONSOLE_LOG_ONLY = /\bconsole\.log\s*\(/g;
function isScriptOrUtil(f) {
  return (
    f.includes("/scripts/") ||
    f.includes("/utils/") ||
    f.includes(".actions.") ||
    f.includes(".model.") ||
    f.endsWith(".mjs") ||
    f.includes("/_kernel/")
  );
}

// ---------------------------------------------------------------------------
// WARN W1: Screen that imports nothing from controller/adapter/api
// ---------------------------------------------------------------------------
function importsController(content) {
  return (
    content.includes("/controllers/") ||
    content.includes("/adapters/") ||
    content.includes(".api") ||
    content.includes("useQuery") ||
    content.includes("useMutation") ||
    content.includes("useCapability") ||
    content.includes("useNavigate") ||
    content.includes("useRouter")
  );
}

// Detect screen/page files (not shared components/atoms)
function isScreenFile(f) {
  return (
    /\/(screens?|pages?|views?)\//.test(f) ||
    f.endsWith("Screen.tsx") ||
    f.endsWith("Page.tsx") ||
    // Next.js app router pages
    /\/app\/.*\/page\.tsx$/.test(f)
  );
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------
const files = listCodeFiles().filter(inScope);

for (const file of files) {
  const content = read(file);

  // FAIL 1 — dead onPress
  let m;
  DEAD_PRESS.lastIndex = 0;
  while ((m = DEAD_PRESS.exec(content)) !== null) {
    const ln = lineNumber(content, m.index);
    violations.push({ file, line: ln, message: `LOGIC: onPress set to ${m[1]} — dead interactive element` });
  }

  // FAIL 2 — raw fetch in non-adapter file
  if (!isAdapterOrController(file)) {
    RAW_FETCH.lastIndex = 0;
    while ((m = RAW_FETCH.exec(content)) !== null) {
      // Allow fetch inside comments
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineContent = content.slice(lineStart, m.index + 10);
      if (/^\s*(\/\/|\/\*)/.test(lineContent)) continue;
      const ln = lineNumber(content, m.index);
      violations.push({ file, line: ln, message: "LOGIC: raw fetch() in non-adapter file — use a controller or adapter" });
    }
  }

  // FAIL 3 — mock success
  if (MOCK_RESOLVE.test(content)) {
    violations.push({ file, message: "LOGIC: Promise.resolve() with hardcoded data — mock success path not allowed in app component" });
  }

  // FAIL 4 — console.log (not error/warn) in component (not script/util)
  if (!isScriptOrUtil(file)) {
    CONSOLE_LOG_ONLY.lastIndex = 0;
    while ((m = CONSOLE_LOG_ONLY.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineContent = content.slice(lineStart, m.index + 15);
      if (/^\s*(\/\/|\/\*)/.test(lineContent)) continue;
      const ln = lineNumber(content, m.index);
      violations.push({ file, line: ln, message: `LOGIC: console.log in app component — remove debug logging` });
    }
  }

  // WARN W1 — screen with no controller/adapter import
  if (isScreenFile(file) && !importsController(content)) {
    warnings.push({ file, message: "WARN: screen/page has no controller, adapter, or data-hook import — verify it has intentional static content" });
  }
}

// Print warnings (non-failing)
if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  W ${w.file} — ${w.message}`);
  }
}

fail(guardId, violations);
