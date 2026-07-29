/**
 * contract-registry-drift-gate.mjs
 *
 * The contract registry is a derived diagnostic, never a tracked source. This
 * gate rejects the old committed copy, generates a fresh report in an isolated
 * temporary directory, and validates that the six canonical bounded contexts
 * each resolve to exactly one generated OpenAPI TypeScript client.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "contract-registry-drift-gate";
const violations = [];
const trackedRegistryPath = "contracts/generated/contract-registry.json";
const trackedRegistryAbsolute = path.join(repoRoot, trackedRegistryPath);

if (fs.existsSync(trackedRegistryAbsolute)) {
  violations.push({
    file: trackedRegistryPath,
    message: "TRACKED_DERIVED_CONTRACT_REGISTRY_FORBIDDEN; Git history is the archive and diagnostics must remain untracked",
  });
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-contract-registry-"));
const diagnosticPath = path.join(temporaryRoot, "contract-registry.json");
const generator = path.join(repoRoot, "tools/scripts/generate-contract-registry.mjs");

try {
  const result = spawnSync(process.execPath, [generator, "--output", diagnosticPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    violations.push({
      file: "tools/scripts/generate-contract-registry.mjs",
      message: `CONTRACT_REGISTRY_GENERATION_FAILED: ${(result.stderr || result.stdout || "").trim()}`,
    });
  } else if (!fs.existsSync(diagnosticPath)) {
    violations.push({
      file: "tools/scripts/generate-contract-registry.mjs",
      message: "CONTRACT_REGISTRY_DIAGNOSTIC_MISSING",
    });
  } else {
    let report;
    try {
      report = JSON.parse(fs.readFileSync(diagnosticPath, "utf8"));
    } catch (error) {
      violations.push({
        file: "tools/scripts/generate-contract-registry.mjs",
        message: `CONTRACT_REGISTRY_DIAGNOSTIC_INVALID_JSON: ${error.message}`,
      });
    }

    if (report) {
      const expectedContexts = new Set([
        "core/identity",
        "core/platform-control",
        "core/providers",
        "core/workforce",
        "services/dsh",
        "services/wlt",
      ]);
      const actualContexts = new Set((report.contexts ?? []).map((context) => context.context));

      if (report.reportRole !== "DERIVED_DIAGNOSTIC_ONLY") {
        violations.push({ file: diagnosticPath, message: "CONTRACT_REGISTRY_REPORT_ROLE_INVALID" });
      }
      if (report.master !== "contracts/master.openapi.yaml" || report.masterRole !== "MASTER_INDEX_ONLY") {
        violations.push({ file: diagnosticPath, message: "CONTRACT_REGISTRY_MASTER_AUTHORITY_INVALID" });
      }
      if (report.totals?.contexts !== expectedContexts.size || actualContexts.size !== expectedContexts.size) {
        violations.push({ file: diagnosticPath, message: "CONTRACT_REGISTRY_CONTEXT_COUNT_INVALID" });
      }
      for (const expectedContext of expectedContexts) {
        if (!actualContexts.has(expectedContext)) {
          violations.push({ file: diagnosticPath, message: `CONTRACT_REGISTRY_CONTEXT_MISSING ${expectedContext}` });
        }
      }
      for (const context of report.contexts ?? []) {
        if (!Array.isArray(context.clients) || context.clients.length !== 1) {
          violations.push({
            file: context.entry ?? diagnosticPath,
            message: `BOUNDED_CONTEXT_CLIENT_CARDINALITY_INVALID ${context.context}: expected exactly one client`,
          });
          continue;
        }
        if (context.clients[0].mode !== "OPENAPI_TYPESCRIPT") {
          violations.push({
            file: context.clients[0].client ?? context.entry ?? diagnosticPath,
            message: `HAND_AUTHORED_GENERATED_CLIENT_FORBIDDEN ${context.context}`,
          });
        }
      }
    }
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

fail(guardId, violations);