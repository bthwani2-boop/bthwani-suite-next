#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, read, toPosix, repoRoot, findImportSpecifiers, existsResolved } from "./_guard-utils.mjs";

const guardId = "wlt-dsh-frontend-shared-ownership";
const violations = [];
const root = repoRoot;

// Load tsconfig aliases
const tsconfigPath = path.join(repoRoot, "tsconfig.base.json");
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
const aliases = tsconfig?.compilerOptions?.paths ?? {};

function resolveSpecifier(file, specifier) {
  for (const [alias, targets] of Object.entries(aliases)) {
    const target = targets[0];
    if (!target) continue;
    if (specifier === alias) {
      return target;
    }
    if (alias.endsWith("/*") && specifier.startsWith(alias.slice(0, -2))) {
      const sub = specifier.slice(alias.length - 2);
      return target.replace(/\/\*$/, sub);
    }
  }

  if (specifier.startsWith(".") || specifier.startsWith("..")) {
    const baseDir = path.dirname(file);
    const resolved = path.resolve(repoRoot, baseDir, specifier);
    return toPosix(path.relative(repoRoot, resolved));
  }

  return specifier;
}

// ── 1. Required Boundary Files ──
const REQUIRED_BOUNDARY_FILES = [
  "services/wlt/frontend/shared/dsh/index.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-boundary.types.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.view-model.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.states.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-api-base-url.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.api.ts",
  "services/wlt/frontend/shared/dsh/use-wlt-dsh-reference-controller.tsx",
  "services/wlt/frontend/shared/dsh/wlt-dsh-field-commission.types.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-field-commission.states.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-field-commission.view-model.ts",
  "services/wlt/frontend/shared/dsh/use-wlt-dsh-field-commission-reference-controller.tsx",
];

for (const rel of REQUIRED_BOUNDARY_FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    violations.push({ file: rel, message: "MISSING required WLT-for-DSH boundary file" });
  }
}

// ── 2. WLT manifest sliceRuntimeVerified validation ──
const wltManifest = "services/wlt/service.manifest.ts";
const WLT_000_EVIDENCE_DIR = "services/wlt/evidence/WLT Foundation-runtime-foundation";
const WLT_000_SLICE_GATE = path.join(root, WLT_000_EVIDENCE_DIR, "journey-gate.txt");
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
        message: `FORBIDDEN: sliceRuntimeVerified: true requires evidence at ${WLT_000_EVIDENCE_DIR} (journey-gate.txt + api-health.txt). Evidence is missing.`,
      });
    }
  }
}

// ── 3. Check Exports in index.ts point to existing files ──
const wltIndexPath = "services/wlt/frontend/shared/dsh/index.ts";
if (fs.existsSync(path.join(root, wltIndexPath))) {
  const content = read(wltIndexPath);
  const specs = findImportSpecifiers(content);
  for (const { specifier } of specs) {
    if (!existsResolved(wltIndexPath, specifier)) {
      violations.push({
        file: wltIndexPath,
        message: `BROKEN EXPORT: file does not exist for specifier '${specifier}'`
      });
    }
  }
}

// ── 4. Reinforce Read-Only Rules inside WLT shared boundary ──
const wltSharedDshPath = "services/wlt/frontend/shared/dsh/";
const approvalPath = path.join(root, wltSharedDshPath, ".wlt-mutation-approved");
const mutationApproved = fs.existsSync(approvalPath);

for (const file of listCodeFiles()) {
  if (!file.startsWith(wltSharedDshPath)) continue;

  const content = read(file);

  // A. Block POST/PUT/PATCH/DELETE methods
  if (!mutationApproved) {
    const httpMutationRegex = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i;
    if (httpMutationRegex.test(content)) {
      violations.push({
        file,
        message: `FORBIDDEN: mutation HTTP method in read-only boundary file`
      });
    }
  }

  // B. Block mutation function name patterns
  const mutationFuncRegexes = [
    /\b(?:export\s+)?(?:async\s+)?function\s+((?:create|update|mutate|confirm|finalize|settle|post|refund|payout)\w*)\b/g,
    /\b(?:export\s+)?const\s+((?:create|update|mutate|confirm|finalize|settle|post|refund|payout)\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/g,
    /\b(?:export\s+)?const\s+((?:create|update|mutate|confirm|finalize|settle|post|refund|payout)\w*)\s*=\s*(?:async\s*)?function\b/g
  ];

  for (const regex of mutationFuncRegexes) {
    let match;
    while ((match = regex.exec(content))) {
      violations.push({
        file,
        message: `FORBIDDEN: mutation function declaration '${match[1]}' in read-only boundary`
      });
    }
  }

  const ledgerMutationRegex = /\b(?:ledger_mutation|ledgermutation|ledgerMutation)\b/gi;
  if (ledgerMutationRegex.test(content)) {
    violations.push({
      file,
      message: `FORBIDDEN: ledger mutation reference in read-only boundary`
    });
  }

  // C. Block fallback localhost
  const localhostRegex = /\bhttp:\/\/(?:localhost|127\.0\.0\.1)\b/i;
  if (localhostRegex.test(content)) {
    violations.push({
      file,
      message: `FORBIDDEN: hardcoded localhost fallback is not allowed inside shared WLT boundary`
    });
  }
}

// ── 5. Check DSH Surfaces imports from WLT shared boundary ──
const DSH_SURFACE_SCOPES = [
  "services/dsh/frontend/control-panel/",
  "services/dsh/frontend/app-client/",
  "services/dsh/frontend/app-partner/",
  "services/dsh/frontend/app-field/",
  "services/dsh/frontend/app-captain/",
];

for (const file of listCodeFiles()) {
  const posix = toPosix(file);
  const matchedSurface = DSH_SURFACE_SCOPES.find((s) => posix.startsWith(s));
  if (!matchedSurface) continue;

  const content = read(file);
  const specs = findImportSpecifiers(content);

  for (const { specifier } of specs) {
    const resolved = resolveSpecifier(file, specifier);

    if (resolved.startsWith("services/wlt/")) {
      // 1. Block DSH surface from WLT backend/clients/generated
      if (
        resolved.startsWith("services/wlt/backend/") ||
        resolved.startsWith("services/wlt/clients/") ||
        resolved.startsWith("services/wlt/generated/")
      ) {
        violations.push({
          file,
          message: `FORBIDDEN: DSH surface importing WLT backend/clients/generated directly (resolved: ${resolved})`
        });
      }

      // 2. Block DSH surface from importing WLT API/controller-core directly
      if (
        resolved.endsWith(".api") ||
        resolved.includes(".api.") ||
        resolved.includes(".api/") ||
        resolved.endsWith(".controller-core") ||
        resolved.includes(".controller-core.") ||
        resolved.includes(".controller-core/")
      ) {
        violations.push({
          file,
          message: `FORBIDDEN: DSH surface importing WLT API/controller-core directly (resolved: ${resolved})`
        });
      }

      // 3. Block app-field from WLT dependency outside whitelisted read-only shared/dsh files
      if (posix.startsWith("services/dsh/frontend/app-field/")) {
        const isAllowedWltImport =
          resolved.startsWith("services/wlt/frontend/shared/dsh/") &&
          (
            resolved === "services/wlt/frontend/shared/dsh/index" ||
            resolved === "services/wlt/frontend/shared/dsh/index.ts" ||
            resolved.endsWith(".types") ||
            resolved.endsWith(".types.ts") ||
            resolved.endsWith(".states") ||
            resolved.endsWith(".states.ts") ||
            resolved.endsWith(".view-model") ||
            resolved.endsWith(".view-model.ts") ||
            resolved.endsWith(".contract") ||
            resolved.endsWith(".contract.ts") ||
            (resolved.includes("use-") && (resolved.endsWith("-controller") || resolved.endsWith("-controller.tsx")))
          );
        if (!isAllowedWltImport) {
          violations.push({
            file,
            message: `FORBIDDEN: app-field is only allowed to consume read-only references from whitelisted files in services/wlt/frontend/shared/dsh/ (resolved: ${resolved})`
          });
        }
      }
    }
  }
}

// ── 6. Keep Legacy Financial Mutation Checks ──
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
