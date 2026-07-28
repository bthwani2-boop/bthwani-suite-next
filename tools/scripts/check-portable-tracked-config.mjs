import "./check-refoundation-foundation.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const policy = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "governance/cleanup/repository-retention-policy.json"), "utf8"),
);
const config = policy.portableTrackedConfiguration ?? {};
const patterns = (config.forbiddenContentPatterns ?? []).map((pattern) => new RegExp(pattern, "i"));
const violations = [];

for (const file of config.files ?? []) {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, "utf8");
  const lines = content.split(/\r?\n/);
  for (const pattern of patterns) {
    const index = content.search(pattern);
    if (index < 0) continue;
    const line = content.slice(0, index).split(/\r?\n/).length;
    violations.push({ file, line, pattern: String(pattern), content: lines[line - 1]?.trim() ?? "" });
  }
}

if (violations.length > 0) {
  console.error("portable-tracked-config: FAIL");
  for (const violation of violations) {
    console.error(`::error file=${violation.file},line=${violation.line},title=NON_PORTABLE_TRACKED_CONFIG::${violation.pattern}`);
    console.error(`- ${violation.file}:${violation.line} ${violation.content}`);
  }
  process.exit(1);
}

console.log("portable-tracked-config: PASS");
