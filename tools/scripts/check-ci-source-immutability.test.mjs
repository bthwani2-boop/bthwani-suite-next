import assert from "node:assert/strict";
import test from "node:test";
import { scanWorkflowContent } from "./check-ci-source-immutability.mjs";

function ids(content, relative) {
  return scanWorkflowContent(content, relative).map((violation) => violation.id);
}

const validRemediation = `
name: BThwani Expert Live-Code Remediation
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  prepare:
    name: Forensic discovery and deterministic repair
    steps:
      - uses: actions/checkout@0123456789012345678901234567890123456789
        with:
          persist-credentials: false
      - run: git restore --source=HEAD -- .github
      - run: pnpm exec nx run-many -t lint --all --fix
      - run: echo patch_sha256
      - run: echo Unapproved deletion rejected
  publish:
    name: Publish reviewed remediation pull request
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@0123456789012345678901234567890123456789
        with:
          persist-credentials: false
      - run: git commit -m repair
      - run: git push origin HEAD:automation/repair
  result:
    steps:
      - run: echo done
`;

test("allows read-only verification commands", () => {
  const workflow = `
permissions:
  contents: read
steps:
  - uses: actions/checkout@0123456789012345678901234567890123456789
    with:
      persist-credentials: false
  - run: git diff --check HEAD^ HEAD
`;
  assert.deepEqual(ids(workflow), []);
});

test("allows read-only workflow-run analysis without source checkout", () => {
  const workflow = `
on:
  workflow_run:
    workflows: [CI]
permissions:
  actions: read
  contents: read
steps:
  - run: gh api repos/example/project/actions/runs/1/jobs
`;
  assert.deepEqual(ids(workflow), []);
});

test("detects privileged triggers that checkout repository source", () => {
  const workflow = `
on:
  workflow_run:
    workflows: [CI]
permissions:
  contents: read
steps:
  - uses: actions/checkout@0123456789012345678901234567890123456789
`;
  assert.deepEqual(ids(workflow), ["PRIVILEGED_TRIGGER_SOURCE_EXECUTION"]);
});

test("detects indented git push inside run blocks", () => {
  const workflow = `
steps:
  - run: |
      git add -A
      git commit -m "unsafe"
      git push origin HEAD
`;
  assert.deepEqual(ids(workflow), [
    "SOURCE_MUTATING_GIT_COMMAND",
    "SOURCE_MUTATING_GIT_COMMAND",
    "SOURCE_MUTATING_GIT_COMMAND",
  ]);
});

test("detects source write permission", () => {
  const workflow = `
permissions:
  contents: write
`;
  assert.deepEqual(ids(workflow), ["SOURCE_WRITE_PERMISSION"]);
});

test("detects automatic commit actions", () => {
  const workflow = `
steps:
  - uses: stefanzweifel/git-auto-commit-action@0123456789012345678901234567890123456789
`;
  assert.deepEqual(ids(workflow), ["AUTO_COMMIT_ACTION"]);
});

test("detects source-rewriting formatter commands", () => {
  const workflow = `
steps:
  - run: pnpm exec prettier --write "**/*.ts"
  - run: npx eslint . --fix
`;
  assert.deepEqual(ids(workflow), ["SOURCE_FORMAT_WRITE", "SOURCE_FORMAT_WRITE"]);
});

test("allows only the hardened manual remediation workflow to write", () => {
  assert.deepEqual(ids(validRemediation, ".github/workflows/remediation-analysis.yml"), []);
});

test("rejects secrets in the remediation workflow", () => {
  const workflow = validRemediation.replace("echo done", "echo ${{ secrets.DANGEROUS_TOKEN }}");
  assert.ok(ids(workflow, ".github/workflows/remediation-analysis.yml").includes("REMEDIATION_REPOSITORY_SECRET_FORBIDDEN"));
});

test("rejects automatic privileged remediation triggers", () => {
  const workflow = validRemediation.replace("  workflow_dispatch:", "  workflow_run:");
  const result = ids(workflow, ".github/workflows/remediation-analysis.yml");
  assert.ok(result.includes("REMEDIATION_MANUAL_TRIGGER_REQUIRED"));
  assert.ok(result.includes("REMEDIATION_PRIVILEGED_TRIGGER_FORBIDDEN"));
  assert.ok(result.includes("PRIVILEGED_TRIGGER_SOURCE_EXECUTION"));
});
