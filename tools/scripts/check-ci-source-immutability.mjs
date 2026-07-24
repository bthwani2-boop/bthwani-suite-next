import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowsRoot = path.join(repoRoot, ".github", "workflows");

function listWorkflowFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      listWorkflowFiles(absolute, output);
      continue;
    }
    if (/\.ya?ml$/i.test(entry.name)) output.push(absolute);
  }
  return output;
}

const forbiddenPatterns = [
  {
    id: "WRITE_ALL_PERMISSION",
    regex: /^\s*permissions:\s*write-all\s*(?:#.*)?$/i,
    reason: "verification workflows must not receive repository-wide write permissions",
  },
  {
    id: "SOURCE_WRITE_PERMISSION",
    regex: /^\s*contents:\s*write\s*(?:#.*)?$/i,
    reason: "CI may read source but must not write repository contents",
  },
  {
    id: "CI_GIT_COMMIT",
    regex: /(?:^|[;&|]\s*)git\s+commit(?:\s|$)/i,
    reason: "CI must not create source commits",
  },
  {
    id: "CI_GIT_PUSH",
    regex: /(?:^|[;&|]\s*)git\s+push(?:\s|$)/i,
    reason: "CI must not push or rewrite branches",
  },
  {
    id: "CI_PR_MERGE",
    regex: /(?:^|[;&|]\s*)gh\s+pr\s+merge(?:\s|$)/i,
    reason: "CI must not merge pull requests",
  },
  {
    id: "PERSISTED_CHECKOUT_CREDENTIALS",
    regex: /^\s*persist-credentials:\s*true\s*(?:#.*)?$/i,
    reason: "verification checkout credentials must not remain available to later steps",
  },
];

if (!fs.existsSync(workflowsRoot)) {
  console.error("ci-source-immutability: FAIL");
  console.error("- .github/workflows is missing");
  process.exit(1);
}

const violations = [];
for (const absolute of listWorkflowFiles(workflowsRoot)) {
  const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
  const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    for (const rule of forbiddenPatterns) {
      if (!rule.regex.test(line)) continue;
      violations.push({
        file: relative,
        line: index + 1,
        id: rule.id,
        reason: rule.reason,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("ci-source-immutability: FAIL");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.id} — ${violation.reason}`);
  }
  process.exit(1);
}

console.log("ci-source-immutability: PASS");
