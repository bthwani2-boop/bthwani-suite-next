import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowsRoot = path.join(repoRoot, ".github", "workflows");
const remediationWorkflow = ".github/workflows/remediation-analysis.yml";

const forbiddenPatterns = [
  {
    id: "WRITE_ALL_PERMISSION",
    regex: /^\s*permissions:\s*write-all\s*(?:#.*)?$/i,
    reason: "workflows must not receive repository-wide write permissions",
  },
  {
    id: "SOURCE_WRITE_PERMISSION",
    regex: /^\s*contents:\s*write\s*(?:#.*)?$/i,
    reason: "verification workflows may read source but must not write repository contents",
  },
  {
    id: "PERSISTED_CHECKOUT_CREDENTIALS",
    regex: /^\s*persist-credentials:\s*true\s*(?:#.*)?$/i,
    reason: "checkout credentials must not remain available to later steps",
  },
  {
    id: "SOURCE_MUTATING_GIT_COMMAND",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?(?:sudo\s+|env\s+(?:[^\s=]+=[^\s]+\s+)+)?git\s+(?:add|commit|push|merge|rebase|reset|restore|update-ref|checkout\s+(?:-B|--)|switch\s+-C|switch\s+-c|branch\s+-f|tag\s+-f)\b/i,
    reason: "verification workflows must not mutate the worktree, index, refs, commits, tags, or branches",
  },
  {
    id: "SOURCE_MUTATING_GH_COMMAND",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?gh\s+(?:pr\s+(?:create|merge)|api\s+.*(?:--method|-X)\s*(?:POST|PUT|PATCH|DELETE).*\/(?:contents|git\/refs|merges)(?:\b|\/))/i,
    reason: "workflows must not mutate repository source through GitHub CLI",
  },
  {
    id: "SOURCE_MUTATING_REST_ENDPOINT",
    regex: /\/repos\/[^\s"']+\/[^\s"']+\/(?:contents|git\/refs|merges)(?:\b|\/)/i,
    reason: "workflows must not call repository source-mutation REST endpoints",
  },
  {
    id: "AUTO_COMMIT_ACTION",
    regex: /^\s*(?:-\s*)?uses:\s*(?:stefanzweifel\/git-auto-commit-action|EndBug\/add-and-commit|peter-evans\/create-pull-request|ad-m\/github-push-action)@/i,
    reason: "third-party auto-commit and auto-push actions are forbidden",
  },
  {
    id: "SOURCE_FORMAT_WRITE",
    regex: /^\s*(?:-\s*)?(?:run:\s*)?(?:pnpm|npm|npx|yarn|bunx?)\b.*\b(?:prettier\b.*--write|eslint\b.*--fix|nx\b.*--fix)\b/i,
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

function remediationViolations(content, relative) {
  const violations = [];
  const requireMarker = (marker, id) => {
    if (!content.includes(marker)) violations.push({ file: relative, line: 0, id, reason: `required marker missing: ${marker}` });
  };

  requireMarker("name: BThwani Expert Live-Code Remediation", "REMEDIATION_NAME_REQUIRED");
  requireMarker("workflow_dispatch:", "REMEDIATION_MANUAL_TRIGGER_REQUIRED");
  requireMarker("permissions:\n  contents: read", "REMEDIATION_READ_ONLY_REQUIRED");
  requireMarker("Forensic discovery and deterministic repair", "REMEDIATION_PREPARE_JOB_REQUIRED");
  requireMarker("Export evidence-backed remediation patch", "REMEDIATION_EXPORT_REQUIRED");
  requireMarker("manual-patch-only-no-privileged-write", "REMEDIATION_MANUAL_PUBLICATION_REQUIRED");
  requireMarker("persist-credentials: false", "REMEDIATION_CHECKOUT_HARDENING_REQUIRED");
  requireMarker("patch_sha256", "REMEDIATION_PATCH_DIGEST_REQUIRED");
  requireMarker("Unapproved deletion rejected", "REMEDIATION_DELETION_GUARD_REQUIRED");
  requireMarker("Protected deletion rejected", "REMEDIATION_PROTECTED_DELETION_GUARD_REQUIRED");

  if (/^\s{2}(?:workflow_run|pull_request_target|schedule|repository_dispatch):/m.test(content)) {
    violations.push({ file: relative, line: 0, id: "REMEDIATION_PRIVILEGED_TRIGGER_FORBIDDEN", reason: "remediation must remain explicitly manual" });
  }
  if (/\bsecrets\.[A-Za-z0-9_]+\b/.test(content)) {
    violations.push({ file: relative, line: 0, id: "REMEDIATION_REPOSITORY_SECRET_FORBIDDEN", reason: "remediation must not use repository secrets" });
  }
  if (/^\s*(?:id-token|packages|deployments|actions|contents|pull-requests|statuses):\s*write\b/im.test(content)) {
    violations.push({ file: relative, line: 0, id: "REMEDIATION_WRITE_PERMISSION_FORBIDDEN", reason: "read-only remediation may not request write permissions" });
  }
  if (/\b(?:git\s+(?:push|commit)|gh\s+pr\s+(?:create|merge))\b/i.test(content)) {
    violations.push({ file: relative, line: 0, id: "REMEDIATION_BRANCH_OR_PR_MUTATION_FORBIDDEN", reason: "remediation exports a patch only and must not mutate branches or pull requests" });
  }

  return violations;
}

export function scanWorkflowContent(content, relative = "workflow.yml") {
  const violations = [];
  const lines = String(content).split(/\r?\n/);
  const isRemediation = relative === remediationWorkflow;
  const privilegedTriggerLine = lines.findIndex((line) => /^\s*(?:workflow_run|pull_request_target)\s*:/i.test(line));
  const sourceExecutionLine = lines.findIndex((line) => (
    /^\s*(?:-\s*)?uses:\s*actions\/checkout@/i.test(line)
    || /^\s*(?:-\s*)?uses:\s*\.\//i.test(line)
  ));

  if (isRemediation) violations.push(...remediationViolations(String(content), relative));

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
      const remediationException = isRemediation && [
        "SOURCE_MUTATING_GIT_COMMAND",
        "SOURCE_FORMAT_WRITE",
      ].includes(rule.id);
      if (remediationException) continue;
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
