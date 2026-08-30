import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("development CI separates closure identity from a trusted verification frontier", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(workflow, /verify_from_sha: \{type: string, required: false, default: ""\}/u);
  assert.match(workflow, /requested_verification_base_sha: \$\{\{ steps\.identity\.outputs\.requested_verification_base_sha \}\}/u);
  assert.match(workflow, /verification_base_sha: \$\{\{ steps\.scope\.outputs\.verification_base_sha \}\}/u);
  assert.match(workflow, /git merge-base --is-ancestor "\$\{base_sha\}" "\$\{INPUT_VERIFY_FROM_SHA\}"/u);
  assert.match(workflow, /git merge-base --is-ancestor "\$\{INPUT_VERIFY_FROM_SHA\}" "\$\{expected_head\}"/u);
  assert.match(workflow, /commits\/\$\{INPUT_VERIFY_FROM_SHA\}\/status/u);
  assert.match(workflow, /actions\/runs\/\$\{run_id\}/u);
  assert.match(workflow, /expected_title="BThwani CI PR \$\{PR_NUMBER\} \$\{INPUT_VERIFY_FROM_SHA\} @ \$\{base_sha\}"/u);
  assert.match(workflow, /verify_from_sha has no trusted exact PR\/base-bound successful CI evidence/u);
  assert.match(workflow, /CI_BASE_SHA="\$\{effective_base\}"/u);
  assert.match(workflow, /ci_control_plane' "\$\{probe\}"\)" == "true"/u);
  assert.match(workflow, /effective_base="\$\{CLOSURE_BASE_SHA\}"/u);
  assert.match(workflow, /diagnostics:[\s\S]*?base_sha: \$\{\{ needs\.context\.outputs\.verification_base_sha \}\}/u);
  assert.match(workflow, /verification:[\s\S]*?base_sha: \$\{\{ needs\.context\.outputs\.verification_base_sha \}\}/u);
  assert.match(workflow, /backends:[\s\S]*?base_sha: \$\{\{ needs\.context\.outputs\.verification_base_sha \}\}/u);
});

test("Final Closure remains full exact-candidate proof from the PR closure base", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /name: Full CI preflight/u);
  assert.match(workflow, /expected_base_sha: \$\{\{ needs\.resolve\.outputs\.base_sha \}\}/u);
  assert.match(workflow, /full_scope: true/u);
  assert.doesNotMatch(workflow, /verify_from_sha:/u);
});

test("development control-plane verification is materiality routed", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(
    workflow,
    /controls:[\s\S]*?if: \$\{\{ needs\.context\.result == 'success' && \(needs\.context\.outputs\.full_scope == 'true' \|\| needs\.context\.outputs\.ci_control_plane == 'true' \|\| needs\.context\.outputs\.database_changed == 'true'\) \}\}/u,
  );
  assert.match(workflow, /id: migrations[\s\S]*?database_changed == 'true'/u);
  assert.match(workflow, /id: assurance_authority[\s\S]*?ci_control_plane == 'true'/u);
  assert.match(workflow, /Enforce complete material control-plane collection/u);
  assert.match(workflow, /check_result controls "\$\{CONTROLS_RESULT\}" "\$\{CONTROLS_REQUIRED\}"/u);
});

test("ci:check only requests an incremental frontier after exact successful parent evidence and trusted workflow support", () => {
  const command = read("tools/scripts/ci-check.mjs");
  assert.match(command, /trustedWorkflowSupportsVerificationBase/u);
  assert.match(command, /commits\/\$\{sha\}\/status/u);
  assert.match(command, /BThwani CI \/ PR result/u);
  assert.match(command, /verify_from_sha=\$\{verifyFromSha\}/u);
  assert.match(command, /conservative-until-trusted-promotion/u);
  assert.doesNotMatch(command, /sleep|poll|run.?history/iu);
});

test("agent adapter preserves wide discovery and narrow causally complete mutation", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /wide discovery; narrow complete execution/iu);
  assert.match(agents, /Discovery breadth must not be confused with mutation breadth/u);
  assert.match(agents, /smallest causally complete working cone/u);
});
