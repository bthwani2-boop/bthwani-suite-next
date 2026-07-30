import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "../_guard-utils.mjs";

const guardId = "field-surface-truth-gate";
const violations = [];
const roots = [
  "services/dsh/frontend/app-field",
  "apps/app-field/runtime/src",
  "services/dsh/frontend/shared/field-readiness",
  "services/dsh/frontend/shared/field-onboarding",
  "services/dsh/frontend/shared/finance-wlt-link/field-finance",
];

const forbidden = [
  [/\bMath\.random\s*\(/g, "RANDOM_FIELD_RUNTIME_TRUTH_FORBIDDEN"],
  [/\b(?:localStorage|sessionStorage)\b/g, "BROWSER_STORAGE_FIELD_TRUTH_FORBIDDEN"],
  [/\balert\s*\(/gi, "ALERT_ONLY_FIELD_ACTION_FORBIDDEN"],
  [/onPress=\{\(\)\s*=>\s*\{\s*\}\}/g, "EMPTY_FIELD_PRESS_HANDLER_FORBIDDEN"],
  [/onPress:\s*\(\)\s*=>\s*\{\s*\}/g, "EMPTY_FIELD_ACTION_FORBIDDEN"],
  [/\bas\s+any\b|:\s*any\b|Promise<any>/g, "UNSAFE_FIELD_ANY_FORBIDDEN"],
  [/field-local-001|store-1001|visit-local|employee-local/g, "HARDCODED_FIELD_ACTOR_OR_STORE_FORBIDDEN"],
  [/15\.3520|44\.1780|حي الأصبحي/g, "HARDCODED_FIELD_LOCATION_FORBIDDEN"],
  [/catch\s*\{\s*\}/g, "SWALLOWED_FIELD_ERROR_FORBIDDEN"],
  [/if\s*\(\s*identity\.state\.kind\s*!==\s*["']authenticated["']\s*\)\s*return\s+null/g, "UNAUTHENTICATED_FIELD_NULL_SCREEN_FORBIDDEN"],
  [/const\s+visit\s*:\s*DshFieldVisit\s*=\s*\{/g, "FABRICATED_FIELD_VISIT_FORBIDDEN"],
  [/accuracyMeters:\s*(?:pos\.)?coords\.accuracy\s*\?\?\s*0/g, "UNKNOWN_LOCATION_ACCURACY_AS_ZERO_FORBIDDEN"],
  [/set(?:Success|Completed|Uploaded|Submitted)\s*\(\s*true\s*\)\s*;\s*(?:void\s+)?[A-Za-z0-9_.]+\s*\(/g, "FIELD_SUCCESS_BEFORE_MUTATION_FORBIDDEN"],
];

function walk(root) {
  const absolute = path.join(repoRoot, root);
  if (!fs.existsSync(absolute)) {
    violations.push({ file: root, line: 0, message: "MISSING_FIELD_TRUTH_ROOT" });
    return [];
  }
  const files = [];
  const stack = [absolute];
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

for (const absolute of roots.flatMap(walk)) {
  const relative = toPosix(path.relative(repoRoot, absolute));
  const content = fs.readFileSync(absolute, "utf8");
  for (const [pattern, message] of forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({
        file: relative,
        line: lineNumber(content, match.index),
        message,
      });
    }
  }
}

const requiredMarkers = [
  [
    "services/dsh/frontend/shared/field-readiness/field-offline-queue.ts",
    [
      "recoverCorruptFieldOfflineQueue",
      '"create_visit"',
      '"complete_visit"',
      '"upsert_readiness_check"',
      '"create_escalation"',
      "field-op:",
    ],
  ],
  [
    "services/dsh/frontend/shared/field-readiness/field-readiness.api.ts",
    ["buildFieldMutationContext", "field mutation correlation and idempotency must be supplied together"],
  ],
  [
    "services/dsh/frontend/shared/field-readiness/use-field-readiness-controller.tsx",
    [
      'enqueueIfOffline(error, "create_visit"',
      'enqueueIfOffline(error, "complete_visit"',
      'enqueueIfOffline(error, "upsert_readiness_check"',
      'enqueueIfOffline(error, "create_escalation"',
      'checklistState.visit.status !== "in_progress"',
    ],
  ],
  [
    "services/dsh/frontend/app-field/components/DshFieldSurface.tsx",
    ["create_visit:", "complete_visit:", "upsert_readiness_check:", "create_escalation:"],
  ],
  [
    "services/dsh/frontend/shared/finance-wlt-link/field-finance/field-payout-attempt.ts",
    ["getOrCreateFieldPayoutAttempt", "clearFieldPayoutAttempt"],
  ],
  [
    "services/dsh/frontend/shared/finance-wlt-link/field-finance/use-field-finance-controller.ts",
    ["amountMinorUnits > state.wallet.availableBalanceMinorUnits", "submittingRef.current"],
  ],
];

for (const [relative, markers] of requiredMarkers) {
  const absolute = path.join(repoRoot, relative);
  if (!fs.existsSync(absolute)) {
    violations.push({ file: relative, line: 0, message: "MISSING_FIELD_REQUIRED_TRUTH_FILE" });
    continue;
  }
  const content = fs.readFileSync(absolute, "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) {
      violations.push({ file: relative, line: 0, message: `MISSING_FIELD_TRUTH_MARKER:${marker}` });
    }
  }
}

fail(guardId, violations);
