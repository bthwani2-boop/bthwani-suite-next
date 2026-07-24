import assert from "node:assert/strict";
import test from "node:test";
import { scanWorkflowContent } from "./check-ci-source-immutability.mjs";

function ids(content) {
  return scanWorkflowContent(content).map((violation) => violation.id);
}

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
