/**
 * tools/guards/tool-catalog-coverage-gate.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Catalog Coverage Gate
 *
 * Validates that:
 *   1. tool-catalog.v5.json exists and contains all 60 registered V5 tools.
 *   2. Each tool entry has required schema keys: id, category, priority, oss_free, decision, activation.
 *
 * FAIL: missing tools from catalog, malformed entries, or missing files.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "tool-catalog-coverage-gate";
const violations = [];

const catalogPath = path.join(repoRoot, "tools/toolchain/tool-catalog.v5.json");

if (!fs.existsSync(catalogPath)) {
  violations.push({
    file: "tools/toolchain/tool-catalog.v5.json",
    line: 0,
    message: "MISSING_CATALOG: tool-catalog.v5.json does not exist.",
  });
  fail(guardId, violations);
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
} catch (e) {
  violations.push({
    file: "tools/toolchain/tool-catalog.v5.json",
    line: 0,
    message: `INVALID_JSON: Failed to parse catalog JSON — ${e.message}`,
  });
  fail(guardId, violations);
  process.exit(1);
}

const REQUIRED_KEYS = ["id", "category", "priority", "oss_free", "decision", "activation"];

// 60 tools that must be documented in catalog
const EXPECTED_TOOLS = new Set([
  // Security/SCA/SAST
  "codeql", "sonarqube", "semgrep", "gitleaks", "trivy", "osv-scanner",
  // Policy/Governance/Linters
  "opa", "conftest", "regal", "ajv", "markdownlint-cli2", "actionlint", "zizmor", "pinact", "shellcheck", "hadolint", "yamllint", "ls-lint",
  // JavaScript/TypeScript/Structure/Monorepo
  "eslint", "typescript", "knip", "jscpd", "dependency-cruiser", "madge", "nx", "sherif",
  // API/Contracts
  "spectral", "openapi-typescript",
  // Architecture
  "graphify",
  // Testing/QA
  "playwright", "axe", "storybook", "loki", "reg-suit", "xstate", "cucumber",
  // Observability
  "opentelemetry", "jaeger", "prometheus", "grafana",
  // Performance
  "k6", "autocannon", "lighthouse-ci", "size-limit", "tamagui",
  // V5 newly covered
  "cue", "checkov", "renovate", "go-pprof", "expo-atlas", "style-dictionary", "maestro", "detox",
  "lint-staged", "husky", "lefthook", "git-sizer", "syft", "cyclonedx", "next-bundle"
]);

const foundTools = new Set();

for (const entry of catalog.entries || []) {
  if (!entry.id) {
    violations.push({
      file: "tools/toolchain/tool-catalog.v5.json",
      line: 0,
      message: "MALFORMED_ENTRY: Tool entry has no 'id' property.",
    });
    continue;
  }

  foundTools.add(entry.id);

  for (const key of REQUIRED_KEYS) {
    if (entry[key] === undefined) {
      violations.push({
        file: "tools/toolchain/tool-catalog.v5.json",
        line: 0,
        message: `MISSING_PROPERTY: Tool '${entry.id}' is missing required property '${key}'.`,
      });
    }
  }
}

for (const expTool of EXPECTED_TOOLS) {
  if (!foundTools.has(expTool)) {
    violations.push({
      file: "tools/toolchain/tool-catalog.v5.json",
      line: 0,
      message: `MISSING_TOOL: Expected tool '${expTool}' is not documented in tool-catalog.v5.json`,
    });
  }
}

fail(guardId, violations);
