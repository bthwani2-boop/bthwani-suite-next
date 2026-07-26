// Given a task contract's allowedPaths, computes which changed files (from git diff
// against a base ref) fall inside vs outside the frozen scope. Read-only.
import { execFileSync } from "node:child_process";
import { repoRoot, toPosix } from "../_remediation-utils.mjs";

export function matchesPrefix(filePath, prefix) {
  const normalizedPrefix = prefix.replace(/\*+$/, "");
  return filePath === prefix || filePath.startsWith(normalizedPrefix);
}

export function changedFiles(baseRef) {
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], { cwd: repoRoot, encoding: "utf8" });
    return output.split("\n").filter(Boolean).map(toPosix);
  } catch {
    return [];
  }
}

export function calculateAffectedScope(files, allowedPaths) {
  const inside = [];
  const outside = [];
  for (const file of files) {
    if (allowedPaths.some((prefix) => matchesPrefix(file, prefix))) inside.push(file);
    else outside.push(file);
  }
  return { inside, outside };
}

function main() {
  const [baseRef, ...allowedPaths] = process.argv.slice(2);
  if (!baseRef) {
    console.error("usage: calculate-affected-scope.mjs <base-ref> <allowed-path...>");
    process.exit(2);
  }
  const files = changedFiles(baseRef);
  const result = calculateAffectedScope(files, allowedPaths);
  console.log(JSON.stringify({ baseRef, changedFileCount: files.length, ...result }, null, 2));
  process.exit(result.outside.length > 0 ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("calculate-affected-scope.mjs")) main();
