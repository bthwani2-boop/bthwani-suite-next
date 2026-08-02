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
  if (/\/(shell|providers?|layout|_layout)\.(tsx?|jsx?)$/.test(f)) return false;
  if (f.startsWith("tools/")) return false;

  const inApps = /^apps\/[^/]+\/runtime\/src\//.test(f);
  const inServicesFrontend = /^services\/[^/]+\/frontend\//.test(f);
  return inApps || inServicesFrontend;
}

const DEAD_PRESS = /\bonPress\s*=\s*\{?\s*(undefined|null)\s*\}?/g;
const RAW_FETCH = /\bfetch\s*\(/g;
function isAdapterOrController(f) {
  return (
    f.includes("/controllers/") ||
    f.includes("/adapters/") ||
    f.endsWith(".adapter.ts") ||
    f.endsWith(".adapter.tsx") ||
    f.endsWith(".api.ts") ||
    f.endsWith(".api.tsx") ||
    f.endsWith("runtime-adapter.ts") ||
    f.endsWith("api-client.ts") ||
    f.endsWith("/server/bff-proxy.ts") ||
    f.includes("/_kernel/") ||
    f.includes("/http-request") ||
    f.includes("-http-request") ||
    f.includes("/media/") ||
    f.includes(".media.ts") ||
    f.includes("media.controller")
  );
}

const MOCK_RESOLVE = /\bPromise\.resolve\s*\(\s*[{[]/;
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

// A route shim that renders a governed screen is covered by that screen, not by
// its own imports. Next.js `app/**/page.tsx` files are the main case: they exist
// to bind a URL to a screen exported from `@bthwani/dsh|wlt/...`, and the screen
// they delegate to is itself scanned by this same gate. Matching the delegation
// therefore moves the check one hop rather than skipping it -- without this, every
// correctly-thin route file is reported as if it held static content.
const DELEGATES_TO_GOVERNED_SCREEN =
  /import\s*(?:\{[^}]*\b[A-Z][A-Za-z0-9]*(?:Screen|Panel|Workspace|Shell|View|Dashboard)\b[^}]*\}|[A-Z][A-Za-z0-9]*(?:Screen|Panel|Workspace|Shell|View|Dashboard)\b)\s*from\s*["'](@bthwani\/(?:dsh|wlt)\/[^"']+|\.[^"']*)["']/;

// This codebase names its controllers `use-<domain>-controller.ts(x)` exporting
// `use<Domain>Controller`; it has no `/controllers/` directory anywhere. Matching
// only the directory form meant every screen wired to a real controller through the
// repository's actual convention was reported as unwired.
const IMPORTS_CONTROLLER_MODULE = /from\s*["'][^"']*-controller(?:-core)?["']/;
const USES_CONTROLLER_HOOK = /\buse[A-Z][A-Za-z0-9]*Controller\b/;

// A barrel that only re-exports carries no logic of its own; the module it forwards
// to is scanned by this same gate.
const RE_EXPORT_ONLY = (content) => {
  const meaningful = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/^\s*['"]use (?:client|server)['"];?\s*$/gm, "")
    .trim();
  return meaningful.length > 0 && /^(?:export\s*(?:\{[\s\S]*?\}|\*)\s*from\s*["'][^"']+["'];?\s*)+$/.test(meaningful);
};

function importsController(content) {
  return (
    content.includes("/controllers/") ||
    content.includes("/adapters/") ||
    content.includes(".api") ||
    content.includes("useQuery") ||
    content.includes("useMutation") ||
    content.includes("useCapability") ||
    content.includes("useNavigate") ||
    content.includes("useRouter") ||
    IMPORTS_CONTROLLER_MODULE.test(content) ||
    USES_CONTROLLER_HOOK.test(content) ||
    DELEGATES_TO_GOVERNED_SCREEN.test(content) ||
    RE_EXPORT_ONLY(content)
  );
}

function isScreenFile(f) {
  return (
    /\/(screens?|pages?|views?)\//.test(f) ||
    f.endsWith("Screen.tsx") ||
    f.endsWith("Page.tsx") ||
    /\/app\/.*\/page\.tsx$/.test(f)
  );
}

const files = listCodeFiles().filter(inScope);

for (const file of files) {
  const content = read(file);

  let m;
  DEAD_PRESS.lastIndex = 0;
  while ((m = DEAD_PRESS.exec(content)) !== null) {
    const ln = lineNumber(content, m.index);
    violations.push({ file, line: ln, message: `LOGIC: onPress set to ${m[1]} — dead interactive element` });
  }

  if (!isAdapterOrController(file)) {
    RAW_FETCH.lastIndex = 0;
    while ((m = RAW_FETCH.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineContent = content.slice(lineStart, m.index + 10);
      if (/^\s*(\/\/|\/\*)/.test(lineContent)) continue;
      const ln = lineNumber(content, m.index);
      violations.push({ file, line: ln, message: "LOGIC: raw fetch() in non-adapter file — use a controller or adapter" });
    }
  }

  if (MOCK_RESOLVE.test(content)) {
    violations.push({ file, message: "LOGIC: Promise.resolve() with hardcoded data — mock success path not allowed in app component" });
  }

  if (!isScriptOrUtil(file)) {
    CONSOLE_LOG_ONLY.lastIndex = 0;
    while ((m = CONSOLE_LOG_ONLY.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineContent = content.slice(lineStart, m.index + 15);
      if (/^\s*(\/\/|\/\*)/.test(lineContent)) continue;
      const ln = lineNumber(content, m.index);
      violations.push({ file, line: ln, message: "LOGIC: console.log in app component — remove debug logging" });
    }
  }

  if (isScreenFile(file) && !importsController(content)) {
    warnings.push({ file, message: "WARN: screen/page has no controller, adapter, or data-hook import — verify it has intentional static content" });
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const warning of warnings) {
    console.log(`  W ${warning.file} — ${warning.message}`);
  }
}

fail(guardId, violations);
