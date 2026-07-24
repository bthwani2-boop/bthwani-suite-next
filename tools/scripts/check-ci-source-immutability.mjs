import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowsRoot = path.join(repoRoot, ".github", "workflows");

const forbiddenPatterns = [
  {
    id: "WRITE_ALL_PERMISSION",
    regex: /^\s*permissions:\s*write-all\s*(?:#.*)?$/i,
    reason: "verification workflows must not receive repository-wide write permissions",
  },
  {
    id: "SOURCE_WRITE_PERMISSION",
    regex: /^\s*contents:\s*write\s*(?:#.*)?$/i,
    reason: "verification workflows may read source but must not write repository contents",
  },
  {
    id: "PERSISTED_CHECKOUT_CREDENTIALS",
    regex: /^\s*persist-credentials:\s*true\s*(?:#.*)?$/i,
    reason: "checkout credentials must not remain available to later verification steps",
  },
  {
    id: "SOURCE_MUTATING_GIT_COMMAND",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?(?:sudo\s+|env\s+(?:[^\s=]+=[^\s]+\s+)+)?git\s+(?:add|commit|push|merge|rebase|reset|restore|update-ref|checkout\s+(?:-B|--)|switch\s+-C|branch\s+-f|tag\s+-f)\b/i,
    reason: "verification workflows must not mutate the worktree, index, refs, commits, tags, or branches",
  },
  {
    id: "SOURCE_MUTATING_GH_COMMAND",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?gh\s+(?:pr\s+merge|api\s+.*(?:--method|-X)\s*(?:POST|PUT|PATCH|DELETE).*\/(?:contents|git\/refs|merges)(?:\b|\/))/i,
    reason: "verification workflows must not mutate repository source through GitHub CLI",
  },
  {
    id: "SOURCE_MUTATING_REST_ENDPOINT",
    regex: /\/repos\/[^\s"']+\/[^\s"']+\/(?:contents|git\/refs|merges)(?:\b|\/)/i,
    reason: "verification workflows must not call repository source-mutation REST endpoints",
  },
  {
    id: "AUTO_COMMIT_ACTION",
    regex: /^\s*(?:-\s*)?uses:\s*(?:stefanzweifel\/git-auto-commit-action|EndBug\/add-and-commit|peter-evans\/create-pull-request|ad-m\/github-push-action)@/i,
    reason: "auto-commit and auto-push actions are forbidden in verification workflows",
  },
  {
    id: "SOURCE_FORMAT_WRITE",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?(?:pnpm|npm|npx|yarn|bunx?)\b.*\b(?:prettier\b.*--write|eslint\b.*--fix)\b/i,
    reason: "verification workflows must check formatting and linting without rewriting source",
  },
  {
    id: "IN_PLACE_SOURCE_EDIT",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?(?:sed\s+-i|perl\s+-pi)\b/i,
    reason: "in-place source editing is forbidden in verification workflows",
  },
];

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

export function scanWorkflowContent(content, relative = "workflow.yml") {
  const violations = [];
  const lines = String(content).split(/\r?\n/);
  const privilegedTriggerLine = lines.findIndex((line) => /^\s*(?:workflow_run|pull_request_target)\s*:/i.test(line));
  const sourceExecutionLine = lines.findIndex((line) => (
    /^\s*(?:-\s*)?uses:\s*actions\/checkout@/i.test(line)
    || /^\s*(?:-\s*)?uses:\s*\.\//i.test(line)
  ));

  if (privilegedTriggerLine >= 0 && sourceExecutionLine >= 0) {
    violations.push({
      file: relative,
      line: sourceExecutionLine + 1,
      id: "PRIVILEGED_TRIGGER_SOURCE_EXECUTION",
      reason: "workflow_run or pull_request_target must not checkout or execute repository source",
    });
  }

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
  return violations;
}

export function scanWorkflowDirectory(directory = workflowsRoot) {
  if (!fs.existsSync(directory)) {
    return [{
      file: path.relative(repoRoot, directory).replaceAll(path.sep, "/"),
      line: 0,
      id: "WORKFLOWS_DIRECTORY_MISSING",
      reason: ".github/workflows is missing",
    }];
  }

  const violations = [];
  for (const absolute of listWorkflowFiles(directory)) {
    const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
    violations.push(...scanWorkflowContent(fs.readFileSync(absolute, "utf8"), relative));
  }
  return violations;
}

function main() {
  const violations = scanWorkflowDirectory();
  if (violations.length > 0) {
    console.error("ci-source-immutability: FAIL");
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} ${violation.id} — ${violation.reason}`);
    }
    process.exit(1);
  }
  console.log("ci-source-immutability: PASS");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
