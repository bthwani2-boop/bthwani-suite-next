import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, read, toPosix, repoRoot } from "./_guard-utils.mjs";

const guardId = "wlt-dsh-frontend-shared-ownership";
const violations = [];
const root = repoRoot;

// ── 1. WLT-for-DSH shared boundary must exist ─────────────────────────────────

const REQUIRED_BOUNDARY_FILES = [
  "services/wlt/frontend/shared/dsh/index.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-boundary.types.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.view-model.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.states.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-api-base-url.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.api.ts",
  "services/wlt/frontend/shared/dsh/use-wlt-dsh-reference-controller.tsx",
];

for (const rel of REQUIRED_BOUNDARY_FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    violations.push({ file: rel, message: "MISSING required WLT-for-DSH boundary file" });
  }
}

// ── 2. WLT manifest sliceRuntimeVerified allowed only when WLT-000 evidence is present ──

const wltManifest = "services/wlt/service.manifest.ts";
const WLT_000_EVIDENCE_DIR = "services/wlt/evidence/WLT-000-runtime-foundation";
const WLT_000_SLICE_GATE = path.join(root, WLT_000_EVIDENCE_DIR, "slice-gate.txt");
const WLT_000_API_HEALTH = path.join(root, WLT_000_EVIDENCE_DIR, "api-health.txt");

if (fs.existsSync(path.join(root, wltManifest))) {
  const content = read(wltManifest);
  if (content.includes("sliceRuntimeVerified: true")) {
    const evidenceExists =
      fs.existsSync(path.join(root, WLT_000_EVIDENCE_DIR)) &&
      fs.existsSync(WLT_000_SLICE_GATE) &&
      fs.existsSync(WLT_000_API_HEALTH);
    if (!evidenceExists) {
      violations.push({
        file: wltManifest,
        message: `FORBIDDEN: sliceRuntimeVerified: true requires evidence at ${WLT_000_EVIDENCE_DIR} (slice-gate.txt + api-health.txt). Evidence is missing.`,
      });
    }
  }
}

// ── 3. WLT-for-DSH surface files must not own financial logic ─────────────────

const WLT_DSH_SURFACE_SCOPES = [
  "services/wlt/frontend/app-client/",
  "services/wlt/frontend/control-panel/",
  "services/wlt/frontend/app-partner/",
  "services/wlt/frontend/app-field/",
  "services/wlt/frontend/app-captain/",
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
