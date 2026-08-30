#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const targetRepo = path.resolve(process.env.BTHWANI_TARGET_REPO || process.cwd());
const trustedSha = String(process.env.BTHWANI_TRUSTED_SHA || "").trim();
const candidateSha = String(process.env.BTHWANI_CANDIDATE_SHA || "HEAD").trim() || "HEAD";

// These paths own how evidence is selected, executed, normalized, interpreted,
// waived, or judged. Product source/tests are intentionally not frozen here;
// changing the judge/policy is different from changing the subject under test
// and requires assurance bootstrap.
const protectedPathspecs = [
  ".github/workflows",
  ".github/actions",
  ".opencodereview",
  "AGENTS.md",
  ".agents/INDEX.md",
  ".agents/skills/bthwani-orchestrator/SKILL.md",
  ".agents/skills/bthwani-universal-task-router/SKILL.md",
  ".agents/skills/bthwani-evidence-gate-router/SKILL.md",
  ".agents/skills/bthwani-final-journey-closure-judge/SKILL.md",
  "tools/prompting/bthwani-orchestrator",
  "tools/guards",
  "tools/verification",
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

function gitText(args, options = {}) {
  return execFileSync("git", args, {
    cwd: targetRepo,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  }).trim();
}

function gitBytes(args) {
  return execFileSync("git", args, {
    cwd: targetRepo,
    encoding: "buffer",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function ghText(args) {
  return execFileSync("gh", args, {
    cwd: targetRepo,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1" },
  }).trim();
}

function requireFullSha(value, label) {
  if (!/^[0-9a-f]{40}$/iu.test(value)) {
    throw new Error(`${label} must be an exact 40-character commit SHA`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function emitEvidence({ verdict, trusted, candidate, changedPaths, authorityDiffSha256, bootstrapAttested = false }) {
  const evidence = {
    schema: "BTHWANI_ASSURANCE_AUTHORITY_DRIFT",
    version: 1,
    verdict,
    trustedSha: trusted,
    candidateSha: candidate,
    changedCount: changedPaths.length,
    changedPaths,
    authorityDiffSha256,
    bootstrapAttested,
  };
  const line = `BTHWANI_ASSURANCE_AUTHORITY_DRIFT:v1 ${JSON.stringify(evidence)}`;
  if (verdict === "PASS") console.log(line);
  else console.error(line);
}

function resolveExactOpenPr(candidate, trusted) {
  const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
  if (!repository) throw new Error("GITHUB_REPOSITORY is required for assurance bootstrap validation");
  const response = ghText([
    "api",
    "--method", "GET",
    "-H", "X-GitHub-Api-Version: 2022-11-28",
    `/repos/${repository}/commits/${candidate}/pulls?per_page=100`,
  ]);
  const pulls = JSON.parse(response || "[]");
  const matching = Array.isArray(pulls)
    ? pulls.filter((pr) => pr?.state === "open" && pr?.head?.sha === candidate && pr?.base?.sha === trusted)
    : [];
  if (matching.length !== 1) {
    throw new Error(`assurance bootstrap requires exactly one open PR bound to candidate=${candidate} and trusted-base=${trusted}; found=${matching.length}`);
  }
  return matching[0];
}

function materializeTrustedEvidenceValidator(trusted) {
  const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
  if (!repository) throw new Error("GITHUB_REPOSITORY is required for trusted bootstrap validator loading");
  const encoded = ghText([
    "api",
    "--method", "GET",
    "-H", "X-GitHub-Api-Version: 2022-11-28",
    `/repos/${repository}/contents/tools/scripts/verify-pr-evidence-comments.mjs`,
    "-f", `ref=${trusted}`,
    "--jq", ".content",
  ]).replace(/\s+/gu, "");
  if (!encoded) throw new Error("trusted bootstrap evidence validator could not be loaded");
  const content = Buffer.from(encoded, "base64").toString("utf8");
  if (!content.includes("BTHWANI_ASSURANCE_BOOTSTRAP:v1")) {
    throw new Error("trusted evidence validator does not support assurance bootstrap attestations");
  }
  const directory = mkdtempSync(path.join(tmpdir(), "bthwani-trusted-bootstrap-validator-"));
  const validator = path.join(directory, "verify-pr-evidence-comments.mjs");
  writeFileSync(validator, content, { encoding: "utf8", mode: 0o600 });
  return validator;
}

function validateIndependentBootstrapApproval({ candidate, trusted, authorityDiffSha256, changedCount }) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    throw new Error("assurance authority bootstrap attestation is accepted only on GitHub Actions");
  }
  if (!String(process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim()) {
    throw new Error("GitHub token is required for assurance bootstrap validation");
  }
  const pr = resolveExactOpenPr(candidate, trusted);
  const validator = materializeTrustedEvidenceValidator(trusted);
  execFileSync(process.execPath, [
    validator,
    "bootstrap",
    String(pr.number),
    candidate,
    authorityDiffSha256,
    trusted,
    String(changedCount),
  ], {
    cwd: targetRepo,
    env: { ...process.env },
    stdio: "inherit",
  });
  return pr.number;
}

requireFullSha(trustedSha, "BTHWANI_TRUSTED_SHA");
const resolvedCandidate = gitText(["rev-parse", candidateSha]);
requireFullSha(resolvedCandidate, "candidate SHA");
gitText(["cat-file", "-e", `${trustedSha}^{commit}`]);
gitText(["cat-file", "-e", `${resolvedCandidate}^{commit}`]);

if (trustedSha === resolvedCandidate) {
  const emptyDigest = sha256(Buffer.alloc(0));
  emitEvidence({ verdict: "PASS", trusted: trustedSha, candidate: resolvedCandidate, changedPaths: [], authorityDiffSha256: emptyDigest });
  console.log(`ASSURANCE_AUTHORITY_DRIFT: PASS simulated-trust-root=${trustedSha}`);
  process.exit(0);
}

try {
  gitText(["merge-base", "--is-ancestor", trustedSha, resolvedCandidate]);
} catch {
  throw new Error(`trusted authority ${trustedSha} is not an ancestor of candidate ${resolvedCandidate}`);
}

const diffArgs = [trustedSha, resolvedCandidate, "--", ...protectedPathspecs];
const nameStatus = gitText(["diff", "--name-status", "--find-renames", ...diffArgs]);
const changedPaths = nameStatus
  ? nameStatus.split(/\r?\n/u).filter(Boolean).map((line) => line.split("\t").slice(1)).flat().filter(Boolean)
  : [];
const canonicalDiff = gitBytes(["diff", "--binary", "--full-index", "--find-renames", ...diffArgs]);
const authorityDiffSha256 = sha256(canonicalDiff);

if (nameStatus) {
  emitEvidence({ verdict: "BOOTSTRAP_REQUIRED", trusted: trustedSha, candidate: resolvedCandidate, changedPaths, authorityDiffSha256 });
  console.error("ASSURANCE_AUTHORITY_DRIFT: BOOTSTRAP_REQUIRED");
  console.error(`trusted=${trustedSha}`);
  console.error(`candidate=${resolvedCandidate}`);
  console.error(`authorityDiffSha256=${authorityDiffSha256}`);
  console.error(`protectedChanges=${changedPaths.length}`);
  console.error("ASSURANCE_AUTHORITY_CHANGE_REQUIRES_BOOTSTRAP");
  for (const line of nameStatus.split(/\r?\n/u).filter(Boolean)) console.error(`- ${line}`);

  try {
    const prNumber = validateIndependentBootstrapApproval({
      candidate: resolvedCandidate,
      trusted: trustedSha,
      authorityDiffSha256,
      changedCount: changedPaths.length,
    });
    emitEvidence({
      verdict: "PASS",
      trusted: trustedSha,
      candidate: resolvedCandidate,
      changedPaths,
      authorityDiffSha256,
      bootstrapAttested: true,
    });
    console.log(`ASSURANCE_AUTHORITY_DRIFT: PASS independent-bootstrap-review=PR#${prNumber}`);
    process.exit(0);
  } catch (error) {
    console.error(`ASSURANCE_AUTHORITY_DRIFT: FAIL bootstrap-validation=${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

emitEvidence({ verdict: "PASS", trusted: trustedSha, candidate: resolvedCandidate, changedPaths, authorityDiffSha256 });
console.log(`ASSURANCE_AUTHORITY_DRIFT: PASS trusted=${trustedSha} candidate=${resolvedCandidate}`);
