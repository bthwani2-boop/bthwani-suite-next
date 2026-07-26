// Checks every active/blocked task contract's declared scope against its recorded
// git-diff changed files (relative to source.baseSha): any changed file outside
// scope.allowedPaths, or a changed-file count above scope.maximumChangedFiles, is a
// scope-expansion violation. Fails closed when a contract's baseSha is unreachable.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "scope-expansion-gate";
const violations = [];
const remediationRoot = "governance/remediation";

function readJson(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function matchesPrefix(filePath, prefix) {
  const normalized = prefix.replace(/\*+$/, "");
  return filePath === prefix || filePath.startsWith(normalized);
}

function changedFilesSince(baseSha) {
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${baseSha}...HEAD`], { cwd: repoRoot, encoding: "utf8" });
    return output.split("\n").filter(Boolean);
  } catch {
    return undefined;
  }
}

const tasksRoot = path.join(repoRoot, remediationRoot, "tasks");
for (const bucket of ["active", "blocked"]) {
  const bucketPath = path.join(tasksRoot, bucket);
  if (!fs.existsSync(bucketPath)) continue;
  for (const entry of fs.readdirSync(bucketPath).filter((name) => name.endsWith(".json"))) {
    const relative = `${remediationRoot}/tasks/${bucket}/${entry}`;
    const contract = readJson(relative);
    if (!contract?.source?.baseSha || !contract?.scope) continue;
    const changed = changedFilesSince(contract.source.baseSha);
    if (changed === undefined) {
      violations.push({ file: relative, line: 0, message: `BASE_SHA_UNREACHABLE ${contract.source.baseSha}` });
      continue;
    }
    const allowed = contract.scope.allowedPaths ?? [];
    const forbidden = contract.scope.forbiddenPaths ?? [];
    for (const file of changed) {
      if (!allowed.some((prefix) => matchesPrefix(file, prefix))) {
        violations.push({ file: relative, line: 0, message: `SCOPE_EXPANSION_OUTSIDE_ALLOWED_PATHS ${file}` });
      }
      if (forbidden.some((prefix) => matchesPrefix(file, prefix))) {
        violations.push({ file: relative, line: 0, message: `SCOPE_EXPANSION_INSIDE_FORBIDDEN_PATHS ${file}` });
      }
    }
    if (changed.length > (contract.scope.maximumChangedFiles ?? Infinity)) {
      violations.push({ file: relative, line: 0, message: `CHANGED_FILE_COUNT_EXCEEDS_MAXIMUM ${changed.length} > ${contract.scope.maximumChangedFiles}` });
    }
  }
}

fail(guardId, violations);
