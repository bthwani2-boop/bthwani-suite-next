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
  // WLT owns financial truth, so the field-finance controller lives under the
  // WLT service rather than a DSH-local mirror.
  "services/wlt/frontend/shared/dsh/field-finance",
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
  // Branching on message text hides the reason code and breaks the moment the
  // copy is reworded or localized.
  [/\.message\s*\.\s*includes\s*\(/g, "FIELD_ERROR_TEXT_MATCHING_FORBIDDEN"],
  [/\.message\s*\.\s*(?:startsWith|endsWith|match)\s*\(/g, "FIELD_ERROR_TEXT_MATCHING_FORBIDDEN"],
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
    "services/wlt/frontend/shared/dsh/field-finance/field-payout-attempt.ts",
    ["getOrCreateFieldPayoutAttempt", "clearFieldPayoutAttempt"],
  ],
  [
    "services/wlt/frontend/shared/dsh/field-finance/use-field-finance-controller.ts",
    ["amountMinorUnits > state.wallet.availableBalanceMinorUnits", "submittingRef.current"],
  ],
  // The backend distinguishes precise operational refusals; the surface must
  // carry the reason code, the allowed next action, and the support reference
  // rather than collapsing them into one generic message.
  [
    "services/dsh/frontend/shared/field-readiness/field-readiness.problem-view.ts",
    ["buildFieldProblemView", "NEXT_ACTION_LABELS", "primaryAction", "correlationId"],
  ],
  [
    "services/dsh/frontend/shared/_kernel/dsh-http-request.ts",
    ["parseResponse<T>(response, correlationId)", "correlationId,"],
  ],
  [
    "services/dsh/frontend/app-field/components/DshFieldProblemNotice.tsx",
    ["buildFieldProblemView", "view.retryable && Boolean(onRetry)", "DshFieldReferenceTag"],
  ],
  [
    "services/dsh/frontend/control-panel/shared/ControlPanelFieldProblemPanel.tsx",
    ["buildFieldProblemView", "code={reference}"],
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

// ---------------------------------------------------------------------------
// Governed reason codes must survive to the screen.
//
// The DSH backend distinguishes precise operational refusals (see
// services/dsh/backend/internal/http/fieldreadiness.go). Rendering only
// `state.message` discards the reason code, the allowed next action, whether a
// retry can succeed, and the support correlation id. Every app-field screen
// that narrows an error state must therefore render it through
// DshFieldProblemNotice / DshFieldProblemState.
//
// The allowlist below is a shrinking debt register, not an exemption. Each
// entry reads from a shared controller family (partner / catalog / workforce /
// field-onboarding / wlt) whose error states do not carry a `problem` yet.
// Removing an entry requires that controller family to carry the problem first.
// Entries may be removed, never added.
const PROBLEM_RENDERING_DEBT = new Set([
  "services/dsh/frontend/app-field/account/DshFieldProfileCompletionScreen.tsx",
  "services/dsh/frontend/app-field/account/DshFieldProfileHomeScreen.tsx",
  "services/dsh/frontend/app-field/account/DshFieldProfileScreen.tsx",
  "services/dsh/frontend/app-field/components/DshFieldAssortmentPauseScreen.tsx",
  "services/dsh/frontend/app-field/components/DshFieldPartnerProductsScreen.tsx",
  "services/dsh/frontend/app-field/finance/WltFieldFinanceScreen.tsx",
  "services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx",
  "services/dsh/frontend/app-field/stores/DshFieldPartnerProgressScreen.tsx",
  "services/dsh/frontend/app-field/stores/DshFieldPartnersScreen.tsx",
]);

const ERROR_NARROWING = /kind\s*===\s*["']error["']/;

for (const absolute of walk("services/dsh/frontend/app-field")) {
  const relative = toPosix(path.relative(repoRoot, absolute));
  if (PROBLEM_RENDERING_DEBT.has(relative)) continue;
  const content = fs.readFileSync(absolute, "utf8");
  if (!ERROR_NARROWING.test(content)) continue;
  if (!content.includes("DshFieldProblem")) {
    violations.push({
      file: relative,
      line: lineNumber(content, content.search(ERROR_NARROWING)),
      message: "FIELD_ERROR_MUST_RENDER_GOVERNED_PROBLEM",
    });
  }
}

// Keep the register honest: an entry that no longer needs the exemption must be
// removed so the debt cannot silently persist after the screen is migrated.
for (const relative of PROBLEM_RENDERING_DEBT) {
  const absolute = path.join(repoRoot, relative);
  if (!fs.existsSync(absolute)) {
    violations.push({ file: relative, line: 0, message: "STALE_PROBLEM_RENDERING_DEBT_ENTRY" });
    continue;
  }
  const content = fs.readFileSync(absolute, "utf8");
  if (content.includes("DshFieldProblem")) {
    violations.push({
      file: relative,
      line: 0,
      message: "RESOLVED_PROBLEM_RENDERING_DEBT_ENTRY_MUST_BE_REMOVED",
    });
  }
}

fail(guardId, violations);
