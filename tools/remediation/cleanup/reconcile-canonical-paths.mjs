// Spec S19.7 move-before-archive protocol, as a checklist evaluator: given a
// {oldPath, canonicalPath, referencesUpdated, moved, verified} record, reports which
// step is missing. Never moves or deletes a file itself.
import fs from "node:fs";

export const moveBeforeArchiveSteps = ["identifyCanonical", "updateReferences", "move", "verify", "archiveOld", "verifyAgain"];

export function reconcileCanonicalPath(record) {
  const missing = moveBeforeArchiveSteps.filter((step) => !record[step]);
  return { path: record.oldPath ?? null, canonicalPath: record.canonicalPath ?? null, complete: missing.length === 0, missing };
}

function main() {
  const recordPath = process.argv[2];
  if (!recordPath) {
    console.error("usage: reconcile-canonical-paths.mjs <record.json>");
    process.exit(2);
  }
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  const result = reconcileCanonicalPath(record);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.complete ? 0 : 1);
}

if (process.argv[1]?.endsWith("reconcile-canonical-paths.mjs")) main();
