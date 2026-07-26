// Enforces spec §14: no .github/workflows/temp/ directory; any tracked
// temp-gap-<id>-<hash>.yml must be registered TEMPORARY with a task id, contract
// hash, parent branch, and an unexpired expiry in the workflow registry.
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";
import { resolveWorkflowInventory, workflowsRootRelative } from "./_workflow-registry.mjs";

const guardId = "workflow-temp-files-gate";
const violations = [];
const workflowsDir = path.join(repoRoot, workflowsRootRelative);

if (fs.existsSync(path.join(workflowsDir, "temp"))) {
  violations.push({ file: `${workflowsRootRelative}/temp`, line: 0, message: "FORBIDDEN_TEMP_WORKFLOW_DIRECTORY" });
}

const onDiskFiles = fs.existsSync(workflowsDir) ? fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name)) : [];
const looseTempFiles = onDiskFiles.filter((name) => /^temp-/i.test(name));

const immutableCoreWorkflows = [
  "ci-backends.yml", "ci-node-diagnostics.yml", "ci-node-verification.yml", "ci-policy.yml",
  "ci-runtime.yml", "ci.yml", "dsh-database.yml", "jrn-020-025-sambassam-verify.yml",
  "lockfile-snapshot.yml", "remediation-analysis.yml",
].sort();
const { registry, violations: registryViolations } = resolveWorkflowInventory(repoRoot, immutableCoreWorkflows);
violations.push(...registryViolations);

const registeredTemporaryFiles = new Set(
  (registry?.entries ?? []).filter((entry) => entry.class === "TEMPORARY").map((entry) => entry.path.split("/").pop()),
);

for (const fileName of looseTempFiles) {
  if (!registeredTemporaryFiles.has(fileName)) {
    violations.push({ file: `${workflowsRootRelative}/${fileName}`, line: 0, message: "TEMP_WORKFLOW_NOT_REGISTERED_AS_TEMPORARY" });
  }
}

fail(guardId, violations);
