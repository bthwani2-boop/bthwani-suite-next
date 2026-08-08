/**
 * BThwani repository structure gate.
 * Enforces stable top-level ownership, retired-root absence, bounded depth, and
 * selected cross-service import boundaries. Structure policy is generic; it
 * must not encode feature-specific governance.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "repository-structure-gate";
const violations = [];
const warnings = [];
const DEPTH_WARN = 10;
const DEPTH_FAIL = 12;

const EXCLUDED_DEPTH_DIRS = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx",
  ".cache", "dist", "build", "out", "coverage", "android", "ios",
  "graphify-out", ".diagnostics",
]);

function exists(relative) {
  return fs.existsSync(path.join(repoRoot, relative));
}

// Retired organizational roots must not reappear after the repository was
// consolidated. Git history is the compatibility/archive mechanism.
for (const retired of [
  "tools/important-scripts",
  "tools/contracts",
  "tools/rules",
  "tools/plans",
  "tools/implementing",
  "tools/diagnose-implementing",
  "tools/yagni",
  "tools/toolchain/tool-activation-baseline.json",
  ".reviewdog.yml",
  "governance/operational_journey_protocol_package",
  "governance/domains",
  "governance/product/decisions",
  "governance/prompting",
  "governance/runbooks",
  "governance/guards/registrations",
  "governance/policies/governance.rego",
  "governance/github/repository-enforcement.json",
  "governance/github/repository-enforcement.schema.json",
  "governance/github/full-verification-policy.json",
  ".agents/rules",
  ".agents/adapters",
  ".agents/hooks",
  ".agents/SKILL_CATALOG.md",
  ".agents/AUTHORITY_BOUNDARY.md",
  ".agents/COMMAND_SAFETY_POLICY.md",
  ".agents/EVIDENCE_GATE_ROUTER.md",
]) {
  if (exists(retired)) {
    violations.push({
      file: retired,
      line: 0,
      message: "RETIRED_OR_PARALLEL_ROOT_REINTRODUCED: use the current canonical functional owner instead of recreating a legacy root.",
    });
  }
}

function walkDepth(dir, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_DEPTH_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    const d = depth + 1;
    if (d >= DEPTH_FAIL) violations.push({ file: rel + "/", line: 0, message: `DEPTH_TOO_DEEP: folder depth ${d} exceeds maximum ${DEPTH_FAIL}.` });
    else if (d >= DEPTH_WARN) warnings.push({ file: rel + "/", line: 0, message: `DEPTH_WARN: folder depth ${d} is near the maximum ${DEPTH_FAIL}.` });
    walkDepth(full, d);
  }
}
walkDepth(repoRoot);

const CANONICAL_ROOTS = {
  "ui-kit": "shared/ui-kit",
  "design-system": null,
  "design-tokens": null,
};
function findDuplicateFolders(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_DEPTH_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    const canonical = CANONICAL_ROOTS[entry.name];
    if (canonical !== undefined && (canonical === null || rel !== canonical)) {
      violations.push({
        file: rel + "/",
        line: 0,
        message: `FORBIDDEN_DUPLICATE_ROOT: '${entry.name}' must exist only at '${canonical ?? "(nowhere)"}'.`,
      });
    }
    findDuplicateFolders(full);
  }
}
findDuplicateFolders(repoRoot);

const APPROVED_TOP_LEVEL = new Set([
  "apps", "services", "shared", "core", "tools", "infra", "contracts", "docs", "governance", "plans",
  ".agents", ".github", ".vscode", ".expo", ".nx", ".diagnostics", "node_modules", ".pnpm-store",
  "dist", "build", "out", "coverage", "graphify-out", "dist-swagger",
]);
for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || APPROVED_TOP_LEVEL.has(entry.name) || entry.name.startsWith(".")) continue;
  violations.push({
    file: entry.name + "/",
    line: 0,
    message: `UNAPPROVED_TOP_LEVEL: '${entry.name}' is not a registered top-level responsibility.`,
  });
}

const BOUNDARY_RULES = [
  {
    scope: /^services\/wlt\/frontend\//,
    forbidden: /from ['"].*services\/dsh\/(?!clients\/generated)/,
    label: "WLT→DSH_INTERNAL",
    message: "WLT frontend must not import DSH internals directly. Use a canonical generated/public boundary.",
  },
  {
    scope: /^services\/dsh\/frontend\//,
    forbidden: /from ['"].*services\/wlt\/(?!clients\/generated)/,
    label: "DSH→WLT_INTERNAL",
    message: "DSH frontend must not import WLT internals directly. Use a canonical generated/public boundary.",
  },
  {
    scope: /^apps\//,
    forbidden: /from ['"].*services\/[^/]+\/backend\//,
    label: "APP→BACKEND_DIRECT",
    message: "Apps must not import backend modules directly. Use the frontend service layer or generated client.",
  },
];

const codeFiles = listCodeFiles().filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file));
for (const file of codeFiles) {
  for (const rule of BOUNDARY_RULES) {
    if (!rule.scope.test(file)) continue;
    const lines = read(file).split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (rule.forbidden.test(lines[i])) violations.push({ file, line: i + 1, message: `${rule.label}: ${rule.message} | ${lines[i].trim()}` });
    }
  }
}

if (warnings.length) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const warning of warnings) console.log(`  WARN ${warning.file}:${warning.line} — ${warning.message}`);
}

fail(guardId, violations);
