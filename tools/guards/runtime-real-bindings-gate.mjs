import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "runtime-real-bindings-gate";
const violations = [];

function inspect(relative, checks) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, message: "Required file is missing." });
    return;
  }

  const content = fs.readFileSync(full, "utf8");
  for (const check of checks) {
    const matched = check.required
      ? !check.pattern.test(content)
      : check.pattern.test(content);

    if (matched) {
      violations.push({ file: relative, message: check.message });
    }
  }
}

inspect("services/dsh/frontend/shared/catalog/central-catalog.api.ts", [
  {
    pattern: /return\s+null\s*;/,
    message: "Runtime client stubs returning null are forbidden.",
  },
]);

inspect("services/dsh/frontend/shared/dispatch/dispatch.api.ts", [
  {
    pattern: /return\s+null\s*;/,
    message: "Runtime client stubs returning null are forbidden.",
  },
]);

inspect("services/dsh/frontend/app-partner/catalog/ProductMediaScreen.tsx", [
  {
    pattern: /متاح قريباً|disabled=\{isWorking \|\| Platform\.OS !== 'web'\}/,
    message: "Native media upload must not be disabled behind a future placeholder.",
  },
]);

inspect("services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx", [
  {
    pattern: /alternativesMap|Fallback for preview|'Preview'/,
    message: "Dispatch preview data and simulated fallback are forbidden.",
  },
  {
    pattern: /client\.assignCaptain\s*\(/,
    required: true,
    message: "Dispatch must execute the real assignCaptain mutation.",
  },
]);

for (const relative of [
  "apps/app-client/runtime/package.json",
  "apps/app-partner/runtime/package.json",
  "apps/app-captain/runtime/package.json",
  "apps/app-field/runtime/package.json",
]) {
  inspect(relative, [
    {
      pattern: /\|\|\s*echo|Pre-existing TS errors ignored/,
      message: "TypeScript failure suppression is forbidden.",
    },
  ]);
}

fail(guardId, violations);
