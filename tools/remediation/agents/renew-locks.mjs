// Extends a live lock's expiry, but only for the task that already owns it.
import fs from "node:fs";
import path from "node:path";
import { liveLockRoot, readLiveLock } from "./allocate-locks.mjs";

export function renewLock(resource, taskId, newExpiresAt) {
  const existing = readLiveLock(resource);
  if (!existing) return { renewed: false, reason: "NOT_LOCKED" };
  if (existing.taskId !== taskId) return { renewed: false, reason: "LOCK_OWNED_BY_ANOTHER_TASK", heldBy: existing.taskId };
  const slug = resource.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  const updated = { ...existing, expiresAt: newExpiresAt };
  fs.writeFileSync(path.join(liveLockRoot, `${slug}.lock.json`), `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return { renewed: true, lock: updated };
}

function main() {
  const [resource, taskId, newExpiresAt] = process.argv.slice(2);
  if (!resource || !taskId || !newExpiresAt) {
    console.error("usage: renew-locks.mjs <resource> <task-id> <new-expires-at-iso>");
    process.exit(2);
  }
  const result = renewLock(resource, taskId, newExpiresAt);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.renewed ? 0 : 1);
}

if (process.argv[1]?.endsWith("renew-locks.mjs")) main();
