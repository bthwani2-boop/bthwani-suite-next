// Returns the union of execution.changedPaths recorded across every iteration
// record for a task, deduped and sorted.
//
// This is preferred over a git diff commit range (baseSha...HEAD) as the scope-check
// source of truth whenever iteration records exist. GAP-0005: enforce-allowed-paths.mjs
// and scope-expansion-gate.mjs originally diffed only against source.baseSha, which is
// accurate solely when a task's repair happens on an isolated child branch created at
// baseSha. When a task is instead repaired directly on a shared work branch (no
// per-task branch automation exists yet outside a human-gated Agent Controller step),
// every unrelated commit landed on the branch since baseSha shows up as a false
// OUTSIDE_ALLOWED_PATHS / scope-expansion violation. The executor already records the
// files it actually touched in each iteration's execution.changedPaths, so that
// self-declared list is immune to unrelated commits landing on the same branch.
import fs from "node:fs";
import path from "node:path";

export function recordedChangedPaths(repoRoot, taskId) {
  if (!taskId) return [];
  const dir = path.join(repoRoot, "governance", "remediation", "iterations", taskId);
  if (!fs.existsSync(dir)) return [];
  const paths = new Set();
  for (const entry of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    let record;
    try {
      record = JSON.parse(fs.readFileSync(path.join(dir, entry), "utf8"));
    } catch {
      continue;
    }
    for (const changedPath of record?.execution?.changedPaths ?? []) paths.add(changedPath);
  }
  return [...paths].sort();
}
