// Compares a task's current changed-file set against the set recorded at contract
// freeze time; any new path not covered by the frozen allowedPaths is scope creep.
import { matchesPrefix } from "./calculate-affected-scope.mjs";

export function detectScopeExpansion(frozenAllowedPaths, filesAtFreeze, filesNow) {
  const frozenSet = new Set(filesAtFreeze);
  const newFiles = filesNow.filter((file) => !frozenSet.has(file));
  const unauthorized = newFiles.filter((file) => !frozenAllowedPaths.some((prefix) => matchesPrefix(file, prefix)));
  return { newFiles, unauthorized, expanded: unauthorized.length > 0 };
}

function main() {
  const [allowedPathsCsv, frozenCsv, nowCsv] = process.argv.slice(2);
  if (!allowedPathsCsv) {
    console.error("usage: detect-scope-expansion.mjs <allowed,paths> <frozen,files> <now,files>");
    process.exit(2);
  }
  const result = detectScopeExpansion(
    allowedPathsCsv.split(",").filter(Boolean),
    (frozenCsv ?? "").split(",").filter(Boolean),
    (nowCsv ?? "").split(",").filter(Boolean),
  );
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.expanded ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("detect-scope-expansion.mjs")) main();
