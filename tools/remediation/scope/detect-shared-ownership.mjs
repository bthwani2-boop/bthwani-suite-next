// Checks a task's changed files against governance/remediation/agent-locks.json's
// globalLockResources; any overlap must resolve to LOCK_CONFLICT before writing.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../_remediation-utils.mjs";
import { matchesPrefix } from "./calculate-affected-scope.mjs";

export function detectSharedOwnership(files, globalLockResources) {
  const conflicts = [];
  for (const file of files) {
    for (const lock of globalLockResources) {
      const pattern = lock.resource.replace(/\*\*/g, "").replace(/\*/g, "");
      if (matchesPrefix(file, pattern) || file.includes(pattern)) {
        conflicts.push({ file, resource: lock.resource, reason: lock.reason });
      }
    }
  }
  return conflicts;
}

function main() {
  const files = process.argv.slice(2);
  const locks = readJson("governance/remediation/agent-locks.json");
  const conflicts = detectSharedOwnership(files, locks?.globalLockResources ?? []);
  if (conflicts.length) {
    console.error(`detect-shared-ownership: LOCK_CONFLICT (${conflicts.length})`);
    for (const conflict of conflicts) console.error(`- ${conflict.file} -> ${conflict.resource}: ${conflict.reason}`);
    process.exit(1);
  }
  console.log("detect-shared-ownership: PASS");
}

if (process.argv[1] && process.argv[1].endsWith("detect-shared-ownership.mjs")) main();
