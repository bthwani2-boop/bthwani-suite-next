#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";

const targetRepo = path.resolve(process.env.BTHWANI_TARGET_REPO || process.cwd());
const trustedSha = String(process.env.BTHWANI_TRUSTED_SHA || "").trim();
const candidateSha = String(process.env.BTHWANI_CANDIDATE_SHA || "HEAD").trim() || "HEAD";

// These paths own how evidence is selected, executed, normalized, or judged.
// Product source/tests are intentionally not frozen here; changing the judge is
// different from changing the subject under test and requires assurance bootstrap.
const protectedPathspecs = [
  ".github/workflows",
  ".github/actions",
  "AGENTS.md",
  ".agents/INDEX.md",
  ".agents/skills/bthwani-orchestrator/SKILL.md",
  ".agents/skills/bthwani-universal-task-router/SKILL.md",
  ".agents/skills/bthwani-evidence-gate-router/SKILL.md",
  ".agents/skills/bthwani-final-journey-closure-judge/SKILL.md",
  "tools/prompting/bthwani-orchestrator",
  "tools/guards",
  "tools/scripts/check-ci-source-immutability.mjs",
  "tools/scripts/check-sonarqube-config.ps1",
  "tools/scripts/classify-semgrep-evidence.mjs",
  "tools/scripts/detect-ci-context.mjs",
  "tools/scripts/generate-sonar-node-coverage.mjs",
  "tools/scripts/install-oss-toolchain-binaries.sh",
  "tools/scripts/invoke-database-upgrade-truth.ps1",
  "tools/scripts/invoke-runtime-phase.ps1",
  "tools/scripts/run-affected-verification.mjs",
  "tools/scripts/run-guard-suite.mjs",
  "tools/scripts/test-service-migration-runner.ps1",
  "tools/scripts/verify-catalog.ps1",
  "tools/scripts/finance/smoke-wlt-authenticated-runtime.ps1",
  "tools/scripts/runtime",
  "tools/scripts/lib/osv-go-reachability.mjs",
  "tools/scripts/lib/package-manager-invocation.mjs",
  "tools/scripts/run-actionlint.mjs",
  "tools/scripts/run-hadolint.mjs",
  "tools/scripts/run-osv-scanner.mjs",
  "tools/scripts/run-pinact.mjs",
  "tools/scripts/run-rendered-control-panel-proof.mjs",
  "tools/scripts/run-shellcheck.mjs",
  "tools/scripts/run-trivy.mjs",
  "tools/scripts/run-yamllint.mjs",
  "tools/scripts/run-zizmor.mjs",
  "tools/scripts/verify-assurance-authority-drift.mjs",
  "tools/scripts/verify-assurance-bootstrap.mjs",
  "tools/scripts/verify-pr-evidence-comments.mjs",
  "tools/mobile/lib/invoke-package-manager.ps1",
  "tools/mobile/lib/package-manager-invocation.mjs",
  "tools/verification/ownership.manifest.json",
  "infra/docker/scripts/runtime-dispatch.ps1",
  "infra/docker/scripts/runtime",
  "sonar-project.properties",
  ".gitleaksignore",
  ".hadolint.yaml",
  ".trivyignore.yaml",
  ".yamllint.yml",
  "osv-scanner.toml",
  "trivy.yaml",
];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: targetRepo,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  }).trim();
}

function requireFullSha(value, label) {
  if (!/^[0-9a-f]{40}$/iu.test(value)) {
    throw new Error(`${label} must be an exact 40-character commit SHA`);
  }
}

requireFullSha(trustedSha, "BTHWANI_TRUSTED_SHA");
const resolvedCandidate = git(["rev-parse", candidateSha]);
requireFullSha(resolvedCandidate, "candidate SHA");
git(["cat-file", "-e", `${trustedSha}^{commit}`]);
git(["cat-file", "-e", `${resolvedCandidate}^{commit}`]);

if (trustedSha === resolvedCandidate) {
  console.log(`ASSURANCE_AUTHORITY_DRIFT: PASS simulated-trust-root=${trustedSha}`);
  process.exit(0);
}

try {
  git(["merge-base", "--is-ancestor", trustedSha, resolvedCandidate]);
} catch {
  throw new Error(`trusted authority ${trustedSha} is not an ancestor of candidate ${resolvedCandidate}`);
}

const diff = git([
  "diff",
  "--name-status",
  "--find-renames",
  trustedSha,
  resolvedCandidate,
  "--",
  ...protectedPathspecs,
]);

if (diff) {
  console.error("ASSURANCE_AUTHORITY_DRIFT: FAIL");
  console.error(`trusted=${trustedSha}`);
  console.error(`candidate=${resolvedCandidate}`);
  console.error("ASSURANCE_AUTHORITY_CHANGE_REQUIRES_BOOTSTRAP");
  for (const line of diff.split(/\r?\n/u).filter(Boolean)) console.error(`- ${line}`);
  process.exit(1);
}

console.log(`ASSURANCE_AUTHORITY_DRIFT: PASS trusted=${trustedSha} candidate=${resolvedCandidate}`);
