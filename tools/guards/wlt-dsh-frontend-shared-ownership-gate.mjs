import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, read, toPosix } from "./_guard-utils.mjs";

const guardId = "wlt-dsh-frontend-shared-ownership";
const violations = [];
const root = process.cwd();

// ── 1. WLT-for-DSH shared boundary must exist ─────────────────────────────────

const REQUIRED_BOUNDARY_FILES = [
  "services/wlt/frontend/dsh/shared/index.ts",
  "services/wlt/frontend/dsh/shared/wlt-dsh-boundary.types.ts",
  "services/wlt/frontend/dsh/shared/wlt-dsh-reference.view-model.ts",
  "services/wlt/frontend/dsh/shared/wlt-dsh-reference.states.ts",
];

for (const rel of REQUIRED_BOUNDARY_FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    violations.push({ file: rel, message: "MISSING required WLT-for-DSH boundary file" });
  }
}

// ── 2. WLT runtime must NOT be falsely claimed active ─────────────────────────

const wltManifest = "services/wlt/service.manifest.ts";
if (fs.existsSync(path.join(root, wltManifest))) {
  const content = read(wltManifest);
  if (content.includes("backendRuntimeReady: true")) {
    violations.push({
      file: wltManifest,
      message: "FORBIDDEN: backendRuntimeReady must remain false — WLT runtime is CONTRACT_ONLY",
    });
  }
  if (content.includes("databaseReady: true")) {
    violations.push({
      file: wltManifest,
      message: "FORBIDDEN: databaseReady must remain false — WLT runtime is CONTRACT_ONLY",
    });
  }
  if (content.includes("sliceRuntimeVerified: true")) {
    violations.push({
      file: wltManifest,
      message: "FORBIDDEN: sliceRuntimeVerified must remain false — WLT runtime is CONTRACT_ONLY",
    });
  }
}

// ── 3. WLT-for-DSH surface files must not own financial logic ─────────────────

const WLT_DSH_SURFACE_SCOPES = [
  "services/wlt/frontend/dsh/app-client/",
  "services/wlt/frontend/dsh/control-panel/",
  "services/wlt/frontend/dsh/app-partner/",
  "services/wlt/frontend/dsh/app-field/",
  "services/wlt/frontend/dsh/app-captain/",
];

const FINANCIAL_MUTATION_PATTERNS = [
  /wallet_balance_mutation/,
  /payment_confirmation/,
  /refund_finalization/,
  /settlement_posting/,
  /ledger_entry_mutation/,
  /payout_decision_mutation/,
  /commission_finalization/,
  /\bmutateWallet\b/,
  /\bconfirmPayment\b/,
  /\bfinalizeRefund\b/,
  /\bpostSettlement\b/,
];

for (const file of listCodeFiles()) {
  const posix = toPosix(file);
  if (!WLT_DSH_SURFACE_SCOPES.some((s) => posix.startsWith(s))) continue;

  const content = read(file);
  for (const pattern of FINANCIAL_MUTATION_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({
        file,
        message: `FORBIDDEN: financial mutation pattern '${pattern.source}' in WLT-for-DSH surface — surfaces are read-only references`,
      });
    }
  }
}

// ── 4. DSH must not mutate WLT financial fields ───────────────────────────────

const DSH_SCOPES = [
  "services/dsh/frontend/",
  "apps/app-client/runtime/",
  "apps/control-panel/runtime/",
  "apps/app-partner/runtime/",
  "apps/app-field/runtime/",
  "apps/app-captain/runtime/",
];

const DSH_FINANCIAL_MUTATION_PATTERNS = [
  /wallet_balance_mutation/,
  /payment_confirmation/,
  /refund_finalization/,
  /settlement_posting/,
  /ledger_entry_mutation/,
  /\bmutateWallet\b/,
  /\bconfirmPayment\b/,
  /\bfinalizeRefund\b/,
];

for (const file of listCodeFiles()) {
  const posix = toPosix(file);
  if (!DSH_SCOPES.some((s) => posix.startsWith(s))) continue;

  const content = read(file);
  for (const pattern of DSH_FINANCIAL_MUTATION_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({
        file,
        message: `FORBIDDEN: DSH surface contains financial mutation '${pattern.source}' — only WLT owns financial mutations`,
      });
    }
  }
}

fail(guardId, violations);
