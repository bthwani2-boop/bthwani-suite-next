import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "toolchain-activation-gate";
const violations = [];

const catalogPath = path.join(repoRoot, "tools/toolchain/tool-catalog.v5.json");
const baselinePath = path.join(repoRoot, "tools/toolchain/tool-activation-baseline.json");
const packageJsonPath = path.join(repoRoot, "package.json");
const workflowsDir = path.join(repoRoot, ".github/workflows");

if (!fs.existsSync(catalogPath) || !fs.existsSync(baselinePath) || !fs.existsSync(packageJsonPath)) {
  violations.push({
    file: "tools/toolchain/tool-activation-baseline.json",
    line: 0,
    message: "MISSING_FILES: catalog, baseline config, or package.json missing.",
  });
  fail(guardId, violations);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const baselineData = JSON.parse(fs.readFileSync(baselinePath, "utf8")).baseline;
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts || {};

// Read workflow contents to verify CI integration
let workflowContents = "";
if (fs.existsSync(workflowsDir)) {
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  for (const f of files) {
    workflowContents += fs.readFileSync(path.join(workflowsDir, f), "utf8") + "\n";
  }
}

function hasBinary(cmd) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const BINARY_MAPPING = {
  "codeql": "codeql",
  "sonarqube": "sonar-scanner",
  "semgrep": "semgrep",
  "gitleaks": "gitleaks",
  "trivy": "trivy",
  "osv-scanner": "osv-scanner",
  "opa": "opa",
  "conftest": "conftest",
  "regal": "regal",
  "actionlint": "actionlint",
  "zizmor": "zizmor",
  "pinact": "pinact",
  "shellcheck": "shellcheck",
  "hadolint": "hadolint",
  "yamllint": "yamllint",
  "ls-lint": "ls-lint",
  "eslint": "eslint",
  "typescript": "tsc",
  "knip": "knip",
  "jscpd": "jscpd",
  "dependency-cruiser": "dependency-cruiser",
  "madge": "madge",
  "nx": "nx",
  "sherif": "sherif",
  "spectral": "spectral",
  "openapi-typescript": "openapi-typescript",
  "graphify": "graphify",
  "playwright": "playwright",
  "k6": "k6",
  "autocannon": "autocannon",
  "size-limit": "size-limit",
  "cue": "cue",
  "checkov": "checkov",
  "git-sizer": "git-sizer",
  "syft": "syft"
};

const EVIDENCE_MAPPING = {
  "trivy": ".diagnostics/security/trivy-report.json",
  "osv-scanner": ".diagnostics/security/osv-report.json",
  "next-bundle": ".diagnostics/performance/status.txt",
  "git-sizer": ".diagnostics/tools-v5/00-summary.md",
  "syft": ".diagnostics/sbom",
  "cyclonedx": ".diagnostics/sbom"
};

const isCI = !!process.env.GITHUB_ACTIONS;

for (const entry of catalog.entries || []) {
  const expected = baselineData[entry.id];
  if (!expected) {
    violations.push({
      file: "tools/toolchain/tool-activation-baseline.json",
      line: 0,
      message: `UNMAPPED_BASELINE: Baseline does not define activation for tool '${entry.id}'`,
    });
    continue;
  }

  if (entry.activation !== expected) {
    violations.push({
      file: "tools/toolchain/tool-catalog.v5.json",
      line: 0,
      message: `ACTIVATION_MISMATCH: Tool '${entry.id}' has activation '${entry.activation}' but baseline requires '${expected}'`,
    });
  }

  const isMandatory = (expected === "active");

  // 1. Script Presence Check
  const scriptKey = Object.keys(scripts).find(key => {
    return key.includes(entry.id) || scripts[key].includes(entry.id);
  });
  if (!scriptKey && isMandatory) {
    violations.push({
      file: "package.json",
      line: 0,
      message: `MISSING_PACKAGE_SCRIPT: Active tool '${entry.id}' has no corresponding script in package.json`,
    });
  }

  // 2. CI Integration Check
  if (isMandatory) {
    const isReferencedInCI = workflowContents.includes(entry.id) || 
      (scriptKey && (
        workflowContents.includes(scriptKey) ||
        Object.keys(scripts).some(k => scripts[k].includes(scriptKey) && workflowContents.includes(k))
      ));
    if (!isReferencedInCI) {
      violations.push({
        file: ".github/workflows",
        line: 0,
        message: `CI_INTEGRATION_MISSING: Active tool '${entry.id}' is not integrated in GitHub Actions workflows.`,
      });
    }
  }

  // 3. Binary presence in CI/CD environment
  if (isMandatory && isCI) {
    const binCmd = BINARY_MAPPING[entry.id];
    if (binCmd && !hasBinary(binCmd)) {
      violations.push({
        file: "tools/toolchain/tool-catalog.v5.json",
        line: 0,
        message: `BINARY_NOT_FOUND: Active tool '${entry.id}' binary '${binCmd}' is missing in CI environment.`,
      });
    }
  }

  // 4. Evidence Report Check
  const evidencePath = EVIDENCE_MAPPING[entry.id];
  if (evidencePath && isMandatory) {
    const fullEvidencePath = path.join(repoRoot, evidencePath);
    if (!fs.existsSync(fullEvidencePath)) {
      const parentDir = path.dirname(fullEvidencePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      violations.push({
        file: evidencePath,
        line: 0,
        message: `EVIDENCE_MISSING: Evidence output path for tool '${entry.id}' does not exist.`,
      });
    }
  }
}

fail(guardId, violations);
