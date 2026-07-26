// Allocates a live lock file under .diagnostics/remediation/locks/ (untracked
// runtime state, per governance/remediation/agent-locks.json). Fails LOCK_CONFLICT
// if the resource is already locked by a different task and not expired.
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../_remediation-utils.mjs";

export const liveLockRoot = path.join(repoRoot, ".diagnostics", "remediation", "locks");

function lockFileFor(resource) {
  const slug = resource.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return path.join(liveLockRoot, `${slug}.lock.json`);
}

export function readLiveLock(resource) {
  const file = lockFileFor(resource);
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

export function isExpired(lock, now = new Date()) {
  return new Date(lock.expiresAt).getTime() < now.getTime();
}

export function allocateLock({ taskId, resource, owner, mode, expiresAt }) {
  const existing = readLiveLock(resource);
  if (existing && existing.taskId !== taskId && !isExpired(existing)) {
    return { allocated: false, reason: "LOCK_CONFLICT", heldBy: existing.taskId, heldSince: existing.owner };
  }
  fs.mkdirSync(liveLockRoot, { recursive: true });
  const lock = { taskId, resource, owner, mode, expiresAt };
  fs.writeFileSync(lockFileFor(resource), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return { allocated: true, lock };
}

function main() {
  const [taskId, resource, owner, mode, expiresAt] = process.argv.slice(2);
  if (!taskId || !resource || !owner || !mode || !expiresAt) {
    console.error("usage: allocate-locks.mjs <task-id> <resource> <owner> <EXCLUSIVE|WRITE|READ> <expires-at-iso>");
    process.exit(2);
  }
  const result = allocateLock({ taskId, resource, owner, mode, expiresAt });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.allocated ? 0 : 1);
}

if (process.argv[1]?.endsWith("allocate-locks.mjs")) main();
