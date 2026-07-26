// Loads a task contract and fails closed if any changed file (vs the recorded
// baseSha) falls outside scope.allowedPaths or inside scope.forbiddenPaths.
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../_remediation-utils.mjs";
import { changedFiles, matchesPrefix } from "./calculate-affected-scope.mjs";
import { recordedChangedPaths } from "./recorded-changed-paths.mjs";

// GAP-0005: prefer the executor's self-declared execution.changedPaths (recorded in
// every iteration) over a baseSha...HEAD commit-range diff, because the latter is only
// accurate when the task ran on an isolated child branch. Falls back to the git diff
// when no iteration has run yet (a fresh, not-yet-repaired task has no recorded paths).
export function resolveChangedFiles(contract) {
  const recorded = recordedChangedPaths(repoRoot, contract?.task?.id);
  return recorded.length > 0 ? recorded : changedFiles(contract.source.baseSha);
}

export function enforceAllowedPaths(contract, files) {
  const allowed = contract?.scope?.allowedPaths ?? [];
  const forbidden = contract?.scope?.forbiddenPaths ?? [];
  const violations = [];
  for (const file of files) {
    if (!allowed.some((prefix) => matchesPrefix(file, prefix))) {
      violations.push({ file, reason: "OUTSIDE_ALLOWED_PATHS" });
    }
    if (forbidden.some((prefix) => matchesPrefix(file, prefix))) {
      violations.push({ file, reason: "INSIDE_FORBIDDEN_PATHS" });
    }
  }
  if (files.length > (contract?.scope?.maximumChangedFiles ?? Infinity)) {
    violations.push({ file: null, reason: `CHANGED_FILE_COUNT_EXCEEDS_MAXIMUM ${files.length} > ${contract.scope.maximumChangedFiles}` });
  }
  return violations;
}

function main() {
  const [contractPath] = process.argv.slice(2);
  if (!contractPath) {
    console.error("usage: enforce-allowed-paths.mjs <task-contract.json>");
    process.exit(2);
  }
  const contract = JSON.parse(fs.readFileSync(path.resolve(repoRoot, contractPath), "utf8"));
  const files = resolveChangedFiles(contract);
  const violations = enforceAllowedPaths(contract, files);
  if (violations.length) {
    console.error(`enforce-allowed-paths: FAIL (${violations.length})`);
    for (const violation of violations) console.error(`- ${violation.file ?? ""} ${violation.reason}`);
    process.exit(1);
  }
  console.log("enforce-allowed-paths: PASS");
}

if (process.argv[1]?.endsWith("enforce-allowed-paths.mjs")) main();
