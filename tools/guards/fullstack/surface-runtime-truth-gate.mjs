import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "../_guard-utils.mjs";

const guardId = "surface-runtime-truth-gate";
const violations = [];

const roots = [
  "services/dsh/frontend/app-client",
  "services/dsh/frontend/app-partner",
  "services/dsh/frontend/app-captain",
  "services/dsh/frontend/app-field",
  "services/dsh/frontend/control-panel",
  "apps/app-client/runtime/src",
  "apps/app-partner/runtime/src",
  "apps/app-captain/runtime/src",
  "apps/app-field/runtime/src",
  "apps/control-panel/runtime/src",
];

const mobileRoots = [
  "services/dsh/frontend/app-client",
  "services/dsh/frontend/app-partner",
  "services/dsh/frontend/app-captain",
  "services/dsh/frontend/app-field",
  "apps/app-client/runtime/src",
  "apps/app-partner/runtime/src",
  "apps/app-captain/runtime/src",
  "apps/app-field/runtime/src",
];

const universalForbidden = [
  [/onPress=\{\(\)\s*=>\s*\{\s*\}\}/g, "EMPTY_PRESS_HANDLER_FORBIDDEN"],
  [/onPress:\s*\(\)\s*=>\s*\{\s*\}/g, "EMPTY_ACTION_HANDLER_FORBIDDEN"],
  [/onSubmit=\{\(\)\s*=>\s*\{\s*\}\}/g, "EMPTY_SUBMIT_HANDLER_FORBIDDEN"],
  [/\bMath\.random\s*\(/g, "RANDOM_RUNTIME_TRUTH_FORBIDDEN"],
  [/\balert\s*\(/g, "ALERT_ONLY_OPERATION_FORBIDDEN"],
  [/catch\s*\{\s*\}/g, "SWALLOWED_RUNTIME_ERROR_FORBIDDEN"],
  [/\bfetch\s*\(/g, "DIRECT_SURFACE_FETCH_FORBIDDEN"],
  [/\baxios\s*\./g, "DIRECT_SURFACE_AXIOS_FORBIDDEN"],
  [/store-1001|field-local-001|captain-local-001|partner-local-001|client-local-001/g, "HARDCODED_RUNTIME_ACTOR_OR_STORE_FORBIDDEN"],
  [/localhost:(?:8080|8081|8082|8083|8084|3000)\b/g, "LEGACY_HOST_PORT_FORBIDDEN"],
  [/set(?:Success|Completed|Uploaded|Submitted|Saved)\s*\(\s*true\s*\)\s*;\s*(?:void\s+)?[A-Za-z0-9_.]+\s*\(/g, "SUCCESS_BEFORE_MUTATION_FORBIDDEN"],
  [/return\s+null\s*;\s*\/\/\s*(?:TODO|placeholder|not implemented)/gi, "PLACEHOLDER_NULL_FORBIDDEN"],
  [/console\.log\s*\([^)]*(?:success|saved|submitted|uploaded|completed)/gi, "CONSOLE_ONLY_SUCCESS_FORBIDDEN"],
];

const mobileForbidden = [
  [/\b(?:localStorage|sessionStorage)\b/g, "BROWSER_STORAGE_MOBILE_TRUTH_FORBIDDEN"],
  [/\bnavigator\.geolocation\b/g, "UNGOVERNED_BROWSER_GEOLOCATION_FORBIDDEN"],
];

function walk(relativeRoot) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) {
    violations.push({
      file: relativeRoot,
      line: 0,
      message: "MISSING_GOVERNED_SURFACE_ROOT",
    });
    return [];
  }

  const files = [];
  const stack = [absoluteRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(child);
    }
  }
  return files;
}

for (const root of roots) {
  const isMobile = mobileRoots.includes(root);
  for (const absolute of walk(root)) {
    const relative = toPosix(path.relative(repoRoot, absolute));
    const content = fs.readFileSync(absolute, "utf8");
    for (const [pattern, message] of [
      ...universalForbidden,
      ...(isMobile ? mobileForbidden : []),
    ]) {
      for (const match of content.matchAll(pattern)) {
        violations.push({
          file: relative,
          line: lineNumber(content, match.index),
          message,
        });
      }
    }
  }
}

fail(guardId, violations);
