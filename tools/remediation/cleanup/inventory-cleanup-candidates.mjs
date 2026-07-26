// PHASE-16/spec S19.1: inventories one file's cleanup-relevant metadata (owner,
// last meaningful change, generated/canonical/runtime/test status) as the input to
// classify-cleanup-candidate.mjs. Read-only; never deletes.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { repoRoot, toPosix, readJson } from "../_remediation-utils.mjs";

function lastMeaningfulChange(relativePath) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%H %cI", "--", relativePath], { cwd: repoRoot, encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

function referenceCount(relativePath) {
  try {
    const baseName = path.basename(relativePath, path.extname(relativePath));
    const output = execFileSync("git", ["grep", "-l", "-F", baseName], { cwd: repoRoot, encoding: "utf8" });
    return output.split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

export function inventoryCandidate(relativePath) {
  const retention = readJson("governance/cleanup/repository-retention-policy.json");
  const posixPath = toPosix(relativePath);
  const generatedRoot = (retention?.generatedOutputRoots ?? []).find((root) => posixPath.startsWith(root));
  const isTest = /\.test\.(mjs|ts|tsx|js)$|_test\.go$/.test(posixPath);
  return {
    path: posixPath,
    exists: fs.existsSync(path.join(repoRoot, posixPath)),
    generatedOutputRoot: generatedRoot ?? null,
    isTest,
    lastMeaningfulChange: lastMeaningfulChange(posixPath),
    referenceCount: referenceCount(posixPath),
  };
}

function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error("usage: inventory-cleanup-candidates.mjs <path...>");
    process.exit(2);
  }
  console.log(JSON.stringify(paths.map(inventoryCandidate), null, 2));
}

if (process.argv[1]?.endsWith("inventory-cleanup-candidates.mjs")) main();
