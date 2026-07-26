// Scans all live locks under .diagnostics/remediation/locks/ and reports resources
// held by more than one non-expired task (should never happen if allocate-locks.mjs
// is used correctly; this is the detection/audit counterpart).
import fs from "node:fs";
import { liveLockRoot, isExpired } from "./allocate-locks.mjs";

export function detectLockConflicts(locks, now = new Date()) {
  const active = locks.filter((lock) => !isExpired(lock, now));
  const byResource = new Map();
  for (const lock of active) {
    const list = byResource.get(lock.resource) ?? [];
    list.push(lock);
    byResource.set(lock.resource, list);
  }
  const conflicts = [];
  for (const [resource, holders] of byResource) {
    const distinctTasks = new Set(holders.map((holder) => holder.taskId));
    if (distinctTasks.size > 1) conflicts.push({ resource, taskIds: [...distinctTasks] });
  }
  return conflicts;
}

function main() {
  const locks = fs.existsSync(liveLockRoot)
    ? fs
        .readdirSync(liveLockRoot)
        .filter((name) => name.endsWith(".lock.json"))
        .map((name) => JSON.parse(fs.readFileSync(`${liveLockRoot}/${name}`, "utf8")))
    : [];
  const conflicts = detectLockConflicts(locks);
  if (conflicts.length) {
    console.error(`detect-lock-conflicts: LOCK_CONFLICT (${conflicts.length})`);
    for (const conflict of conflicts) console.error(`- ${conflict.resource}: ${conflict.taskIds.join(", ")}`);
    process.exit(1);
  }
  console.log("detect-lock-conflicts: PASS");
}

if (process.argv[1]?.endsWith("detect-lock-conflicts.mjs")) main();
