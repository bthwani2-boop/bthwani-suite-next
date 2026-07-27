import assert from "node:assert/strict";
import test from "node:test";
import { validateDirectWorkBranchPolicy } from "./direct-work-branch-execution-gate.mjs";

function validPolicy() {
  return {
    status: "ACTIVE_CANONICAL",
    policyId: "DIRECT_WORK_BRANCH_EXECUTION",
    defaultMode: {
      sourceBranch: "USER_NAMED_WORK_BRANCH",
      targetBranch: "SAME_AS_SOURCE",
      createTaskBranch: false,
      createPullRequest: false,
      mergeAutomatically: false
    },
    rules: {
      pinExactBranchShaBeforeWrite: true,
      conditionalWriteAgainstCurrentFileOrBranchSha: true,
      rePinBranchAfterFinalWrite: true,
      verifyOnSameBranch: true,
      neverForcePush: true,
      neverOverwriteConcurrentMovement: true
    },
    branchCreation: { allowedByDefault: false },
    forbidden: ["AUTOMATIC_TASK_BRANCH", "AUTOMATIC_PULL_REQUEST", "FORCE_PUSH", "STALE_SHA_OVERWRITE"]
  };
}

const ci = `
pull_request:
  branches: ["**"]
push:
  branches: ["**"]
concurrency:
  cancel-in-progress: true
`;

test("accepts direct same-branch execution with universal CI coverage", () => {
  assert.deepEqual(validateDirectWorkBranchPolicy(validPolicy(), ci), []);
});

test("rejects automatic task branches", () => {
  const policy = validPolicy();
  policy.defaultMode.createTaskBranch = true;
  assert.ok(validateDirectWorkBranchPolicy(policy, ci).includes("AUTOMATIC_TASK_BRANCH_NOT_FORBIDDEN"));
});

test("rejects incomplete branch coverage", () => {
  assert.ok(validateDirectWorkBranchPolicy(validPolicy(), 'push:\n  branches: [smar]\n').includes("CI_DOES_NOT_COVER_ALL_NAMED_WORK_BRANCHES"));
});
