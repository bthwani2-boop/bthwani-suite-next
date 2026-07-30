import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policyPath = "governance/authority/direct-work-branch-execution-policy.json";
const schemaPath = "governance/authority/direct-work-branch-execution-policy.schema.json";
const ciPath = ".github/workflows/ci.yml";

export function validateDirectWorkBranchPolicy(policy, ciText) {
  const violations = [];
  if (policy?.status !== "ACTIVE_CANONICAL") violations.push("POLICY_NOT_ACTIVE_CANONICAL");
  if (policy?.policyId !== "DIRECT_WORK_BRANCH_EXECUTION") violations.push("POLICY_ID_MISMATCH");
  if (policy?.defaultMode?.sourceBranch !== "USER_NAMED_WORK_BRANCH") violations.push("SOURCE_BRANCH_NOT_USER_NAMED");
  if (policy?.defaultMode?.targetBranch !== "SAME_AS_SOURCE") violations.push("TARGET_BRANCH_NOT_SAME_AS_SOURCE");
  if (policy?.defaultMode?.createTaskBranch !== false) violations.push("AUTOMATIC_TASK_BRANCH_NOT_FORBIDDEN");
  if (policy?.defaultMode?.createPullRequest !== false) violations.push("AUTOMATIC_PULL_REQUEST_NOT_FORBIDDEN");
  if (policy?.defaultMode?.mergeAutomatically !== false) violations.push("AUTOMATIC_MERGE_NOT_FORBIDDEN");
  if (policy?.branchCreation?.allowedByDefault !== false) violations.push("BRANCH_CREATION_ALLOWED_BY_DEFAULT");
  for (const key of ["pinExactBranchShaBeforeWrite", "conditionalWriteAgainstCurrentFileOrBranchSha", "rePinBranchAfterFinalWrite", "verifyOnSameBranch", "neverForcePush", "neverOverwriteConcurrentMovement"]) {
    if (policy?.rules?.[key] !== true) violations.push(`REQUIRED_RULE_DISABLED:${key}`);
  }
  const forbidden = new Set(policy?.forbidden ?? []);
  for (const value of ["AUTOMATIC_TASK_BRANCH", "AUTOMATIC_PULL_REQUEST", "FORCE_PUSH", "STALE_SHA_OVERWRITE"]) {
    if (!forbidden.has(value)) violations.push(`FORBIDDEN_RULE_MISSING:${value}`);
  }
  const universalBranchTriggers = ciText.match(/branches:\s*\["\*\*"\]/g)?.length ?? 0;
  if (universalBranchTriggers < 2) violations.push("CI_DOES_NOT_COVER_ALL_NAMED_WORK_BRANCHES");
  if (!ciText.includes("cancel-in-progress: true")) violations.push("CI_STALE_RUN_CANCELLATION_MISSING");
  return violations;
}

async function main() {
  const policy = JSON.parse(fs.readFileSync(path.join(repoRoot, policyPath), "utf8"));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, schemaPath), "utf8"));
  const ciText = fs.readFileSync(path.join(repoRoot, ciPath), "utf8");
  const { default: Ajv } = await import("ajv");
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const violations = validate(policy)
    ? []
    : (validate.errors ?? []).map((error) => `SCHEMA:${error.instancePath || "/"}:${error.message}`);
  violations.push(...validateDirectWorkBranchPolicy(policy, ciText));
  if (violations.length) {
    for (const violation of violations) console.error(`direct-work-branch-execution-gate: ${violation}`);
    process.exit(1);
  }
  console.log("direct-work-branch-execution-gate: PASS");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
