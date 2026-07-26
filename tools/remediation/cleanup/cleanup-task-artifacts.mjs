// PHASE-16 cleanup: removes one task's untracked local artifacts (inventory,
// baseline snapshots, live locks) under .diagnostics/remediation/ once the task
// reaches CLEANED. Never touches tracked files.
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../_remediation-utils.mjs";

export function cleanupTaskArtifacts(taskId, { dryRun = true } = {}) {
  const targets = [
    path.join(repoRoot, ".diagnostics", "remediation", "evidence", taskId),
    path.join(repoRoot, ".diagnostics", "remediation", "locks", `${taskId}.lock.json`),
  ];
  const removed = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    removed.push(path.relative(repoRoot, target).replaceAll("\\", "/"));
    if (!dryRun) fs.rmSync(target, { recursive: true, force: true });
  }
  return { taskId, dryRun, removed };
}

function main() {
  const [taskId, mode] = process.argv.slice(2);
  if (!taskId) {
    console.error("usage: cleanup-task-artifacts.mjs <task-id> [--apply]");
    process.exit(2);
  }
  const result = cleanupTaskArtifacts(taskId, { dryRun: mode !== "--apply" });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.endsWith("cleanup-task-artifacts.mjs")) main();
