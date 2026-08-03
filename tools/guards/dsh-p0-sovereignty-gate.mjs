#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: required file is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function mustNotExist(relativePath, reason) {
  if (fs.existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

function reject(relativePath, pattern, reason) {
  const source = read(relativePath);
  if (pattern.test(source)) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

function requirePattern(relativePath, pattern, reason) {
  const source = read(relativePath);
  if (!pattern.test(source)) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

mustNotExist(
  "services/dsh/frontend/shared/checkout/dsh-client-binding.contracts.ts",
  "hardcoded fulfillment, ETA, or commission truth must not exist in DSH frontend",
);

for (const relativePath of [
  "services/dsh/frontend/shared/dispatch/CaptainFinancialEligibilityPanel.tsx",
  "services/dsh/frontend/shared/platform/platform-policies.types.ts",
  "services/dsh/backend/internal/dispatch/financial_eligibility.go",
  "services/dsh/contracts/dsh.captain-financial-eligibility.openapi.yaml",
  "services/dsh/database/migrations/dsh-972_financial_eligibility_wlt_decision_boundary.sql",
]) {
  reject(
    relativePath,
    /available[_A-Za-z]*balance|minimum[_A-Za-z]*(?:dispatch|cod)[_A-Za-z]*balance|wallet_status|walletStatus/i,
    "DSH financial eligibility may contain only opaque WLT decision metadata",
  );
  reject(
    relativePath,
    /Math\.(?:round|floor|ceil)|\b(?:balance|commission|settlement)\w*\s*[+\-*/%]/i,
    "financial arithmetic is forbidden outside WLT",
  );
}

for (const relativePath of [
  "services/dsh/frontend/shared/dispatch/CaptainFinancialEligibilityPanel.tsx",
  "services/dsh/frontend/shared/checkout/checkout.types.ts",
  "services/dsh/frontend/shared/checkout/checkout.states.ts",
]) {
  reject(relativePath, /\bcommissionRate\b|\bcommissionPercent\b/i, "commission policy is WLT-owned");
}

for (const relativePath of [
  "services/dsh/backend/internal/store/governance.go",
  "services/dsh/backend/internal/store/store_access_authorizer.go",
  "services/dsh/backend/internal/fieldreadiness/authz.go",
  "services/dsh/backend/internal/http/protected_store.go",
]) {
  reject(relativePath, /HasPrefix\s*\(\s*[^,]+,\s*["']permission:/, "permission-prefix role interpretation is forbidden");
  reject(relativePath, /Role\s*:\s*["']permission:/, "permissions must not be converted into synthetic roles");
  reject(relativePath, /actor\.Role\s*==\s*["']operator["']|actor\.Role\s*!=\s*["']operator["']/, "operator role-name bypass is forbidden");
}

requirePattern(
  "services/wlt/backend/internal/http/dispatch_financial_eligibility_routes.go",
  /POST \/internal\/dispatch-financial-eligibility\/evaluate/,
  "WLT-owned internal financial decision route is required",
);
requirePattern(
  "services/dsh/backend/internal/wlt/dispatch_financial_eligibility.go",
  /EvaluateDispatchFinancialEligibility/,
  "DSH must consume the WLT decision operation",
);
requirePattern(
  "services/dsh/backend/internal/store/store_access_authorizer.go",
  /type StoreAccessAuthorizer interface/,
  "explicit object authorizer boundary is required",
);
requirePattern(
  "services/dsh/backend/internal/health/health.go",
  /workforce_service_token/,
  "missing Workforce authorization configuration must fail readiness",
);

if (failures.length > 0) {
  console.error("DSH P0 sovereignty gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("DSH P0 sovereignty gate passed.");
