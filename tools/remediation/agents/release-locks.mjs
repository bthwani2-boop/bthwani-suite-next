// Releases a live lock, but only when the caller-provided taskId matches the lock's
// owner task — a task can never release another task's lock.
import fs from "node:fs";
import path from "node:path";
import { liveLockRoot, readLiveLock } from "./allocate-locks.mjs";

export function releaseLock(resource, taskId) {
  const existing = readLiveLock(resource);
  if (!existing) return { released: true, reason: "NOT_LOCKED" };
  if (existing.taskId !== taskId) return { released: false, reason: "LOCK_OWNED_BY_ANOTHER_TASK", heldBy: existing.taskId };
  const slug = resource.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  fs.rmSync(path.join(liveLockRoot, `${slug}.lock.json`), { force: true });
  return { released: true };
}

function main() {
  const [resource, taskId] = process.argv.slice(2);
  if (!resource || !taskId) {
    console.error("usage: release-locks.mjs <resource> <task-id>");
    process.exit(2);
  }
  const result = releaseLock(resource, taskId);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.released ? 0 : 1);
}

if (process.argv[1]?.endsWith("release-locks.mjs")) main();
