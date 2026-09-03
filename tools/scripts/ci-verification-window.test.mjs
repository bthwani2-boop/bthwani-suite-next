import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("h verification is exact-SHA, direct-mutation aware, and free of PR/default-branch authority", () => {
  const workflow = read(".github/workflows/ci-check.yml");

  assert.match(workflow, /push:\s*\n\s*branches: \[h\]/u);
  assert.match(workflow, /workflow_call:/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /expected_head_sha: \{type: string, required: false, default: ""\}/u);
  assert.match(workflow, /expected_base_sha: \{type: string, required: false, default: ""\}/u);
  assert.match(workflow, /TRUSTED_H_BRANCH: h/u);
  assert.match(workflow, /actual_head="\$\(git rev-parse HEAD\)"/u);
  assert.match(workflow, /base_sha="\$\(git rev-parse "\$\{expected_head\}\^"\)"/u);
  assert.match(workflow, /git merge-base --is-ancestor "\$\{base_sha\}" "\$\{expected_head\}"/u);
  assert.match(workflow, /CI_BASE_SHA: \$\{\{ steps\.identity\.outputs\.base_sha \}\}/u);
  assert.match(workflow, /CI_HEAD_SHA: \$\{\{ steps\.identity\.outputs\.head_sha \}\}/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/ci-node-verification\.yml/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/ci-backends\.yml/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/ci-runtime\.yml/u);
  assert.doesNotMatch(workflow, /pull_request|DEFAULT_BRANCH|origin\/HEAD|verify_from_sha/iu);
});

test("Final Baseline requires full exact-h evidence from every configured authority", () => {
  const workflow = read(".github/workflows/final-closure.yml");

  assert.match(workflow, /name: BThwani h Final Baseline/u);
  assert.match(workflow, /TRUSTED_H_BRANCH: h/u);
  assert.match(workflow, /expected_head_sha: \$\{\{ needs\.resolve\.outputs\.head_sha \}\}/u);
  assert.match(workflow, /expected_base_sha: \$\{\{ needs\.resolve\.outputs\.base_sha \}\}/u);
  assert.match(workflow, /full_scope: true/u);
  for (const reusable of [
    "ci-check.yml",
    "sonarqube.yml",
    "codeql.yml",
    "semgrep.yml",
    "security-remote.yml",
    "rendered-web-evidence.yml",
    "dependency-review.yml",
    "lockfile-integrity.yml",
    "docker-runtime-hardening.yml",
  ]) {
    assert.match(workflow, new RegExp(`uses: \\.\\/\\.github\\/workflows\\/${reusable.replaceAll(".", "\\.")}`, "u"));
  }
  assert.doesNotMatch(workflow, /pull_request|DEFAULT_BRANCH|origin\/HEAD|verify_from_sha|mobile-evidence/iu);
  assert.match(workflow, /Enforce complete exact-h evidence collection/u);
});

test("ci:check dispatches only the exact clean remote h head and its first parent", () => {
  const command = read("tools/scripts/ci-check.mjs");

  assert.match(command, /if \(branch !== "h"\)/u);
  assert.match(command, /const headSha = run\("git", \["rev-parse", "HEAD"\]\)/u);
  assert.match(command, /const baseSha = run\("git", \["rev-parse", `\$\{headSha\}\^`\]\)/u);
  assert.match(command, /refs\/heads\/h/u);
  assert.match(command, /if \(remoteSha !== headSha\)/u);
  assert.match(command, /"workflow", "run", "ci-check\.yml"/u);
  assert.match(command, /"--ref", "h"/u);
  assert.match(command, /expected_head_sha=\$\{headSha\}/u);
  assert.match(command, /expected_base_sha=\$\{baseSha\}/u);
  assert.doesNotMatch(command, /pull|PR_NUMBER|DEFAULT_BRANCH|verify_from_sha|trustedWorkflowSupportsVerificationBase/iu);
});

test("AGENTS remains a thin adapter to the canonical orchestrator", () => {
  const agents = read("AGENTS.md");

  assert.match(agents, /This file is routing only/u);
  assert.match(agents, /tools\/prompting\/bthwani-orchestrator\/00-ORCHESTRATOR\.md/u);
  assert.match(agents, /Resolve the exact live remote `h` SHA/u);
  assert.match(agents, /highest correct execution-unit selection/u);
  assert.match(agents, /direct fast-forward mutation on `h` is authorized/u);
  assert.match(agents, /If any text in this adapter conflicts with the orchestrator, the orchestrator wins/u);
  assert.doesNotMatch(agents, /verify_from_sha|trusted verification frontier|smallest causally complete working cone/iu);
});
