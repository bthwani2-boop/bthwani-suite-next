import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "workflow-policy-gate";
const violations = [];
const workflowsDir = path.join(repoRoot, ".github/workflows");

if (!fs.existsSync(workflowsDir)) {
  violations.push({ file: ".github/workflows", line: 0, message: "MISSING_WORKFLOW_DIRECTORY" });
} else {
  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();

  for (const fileName of workflowFiles) {
    const relative = `.github/workflows/${fileName}`;
    const text = fs.readFileSync(path.join(workflowsDir, fileName), "utf8");

    if (!/^permissions:\s*(?:\n|$)/m.test(text) && !/^permissions:\s*\{\s*\}\s*$/m.test(text)) {
      violations.push({ file: relative, line: 0, message: "WORKFLOW_MUST_DECLARE_EXPLICIT_TOP_LEVEL_PERMISSIONS" });
    }
    if (/pull_request_target\s*:/m.test(text)) {
      violations.push({ file: relative, line: 0, message: "PULL_REQUEST_TARGET_FORBIDDEN" });
    }
    if (/contents:\s*write\b/i.test(text) || /write-all\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "SOURCE_CONTENT_WRITE_PERMISSION_FORBIDDEN" });
    }
    if (/\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+merge)\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "CI_SOURCE_OR_BRANCH_MUTATION_FORBIDDEN" });
    }
    if (/\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|sed\s+-i|perl\s+-pi)\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "CI_FIX_OR_SOURCE_REWRITE_COMMAND_FORBIDDEN" });
    }
    if (/@latest\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "LATEST_VERSION_FORBIDDEN_IN_REQUIRED_WORKFLOW" });
    }
    if (/^\s*ref:\s*(?:reem|sam|onebyone|implementing|master)\s*$/m.test(text)) {
      violations.push({ file: relative, line: 0, message: "EXPLICIT_FOREIGN_BRANCH_CHECKOUT_FORBIDDEN" });
    }
    if (/one-time/i.test(fileName) || /One-time/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "ONE_TIME_WORKFLOW_FORBIDDEN" });
    }
  }

  const branchRequired = [
    "ci.yml",
    "security.yml",
    "governance-audit.yml",
    "dsh-operational-closure-ci.yml",
  ];
  for (const fileName of branchRequired) {
    const fullPath = path.join(workflowsDir, fileName);
    if (!fs.existsSync(fullPath)) {
      violations.push({ file: `.github/workflows/${fileName}`, line: 0, message: "REQUIRED_WORKFLOW_MISSING" });
      continue;
    }
    const text = fs.readFileSync(fullPath, "utf8");
    if (!/(?:branches:\s*\[[^\]]*\bbassam\b|^\s*-\s+bassam\s*$)/m.test(text)) {
      violations.push({ file: `.github/workflows/${fileName}`, line: 0, message: "ACTIVE_REMOTE_BRANCH_BASSAM_NOT_COVERED" });
    }
  }

  const governancePath = path.join(workflowsDir, "governance-audit.yml");
  if (fs.existsSync(governancePath)) {
    const text = fs.readFileSync(governancePath, "utf8");
    for (const marker of [
      '"AGENTS.md"',
      '"GEMINI.md"',
      '".agents/**"',
      '"governance/**"',
      '"tools/guards/**"',
      '"package.json"',
      '".github/workflows/**"',
    ]) {
      if (!text.includes(marker)) {
        violations.push({ file: ".github/workflows/governance-audit.yml", line: 0, message: `GOVERNANCE_TRIGGER_PATH_MISSING ${marker}` });
      }
    }
  }
}

fail(guardId, violations);
