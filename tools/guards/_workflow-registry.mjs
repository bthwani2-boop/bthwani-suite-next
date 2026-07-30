import fs from "node:fs";
import path from "node:path";

export const workflowRegistryRelative = "governance/github/workflow-registry.json";
export const workflowsRootRelative = ".github/workflows";

/**
 * Resolves the expected workflow inventory from the registry.
 *
 * The registry may add or remove task-class workflows, but it can never change the
 * immutable core: each consuming guard passes its own hard-coded core list and a
 * mismatch fails. A missing or invalid registry is fail-closed — the guard falls back
 * to the immutable core so an unregistered workflow still trips inventory drift.
 */
export function resolveWorkflowInventory(repoRoot, immutableCore, today = new Date()) {
  const violations = [];
  const core = [...immutableCore].sort();
  const fullPath = path.join(repoRoot, workflowRegistryRelative);

  if (!fs.existsSync(fullPath)) {
    violations.push({ file: workflowRegistryRelative, line: 0, message: "WORKFLOW_REGISTRY_MISSING" });
    return { expectedFiles: core, registry: undefined, violations };
  }

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: workflowRegistryRelative, line: 0, message: `WORKFLOW_REGISTRY_INVALID_JSON ${error.message}` });
    return { expectedFiles: core, registry: undefined, violations };
  }

  const registryCore = [...(registry.coreWorkflows ?? [])].sort();
  if (JSON.stringify(registryCore) !== JSON.stringify(core)) {
    violations.push({
      file: workflowRegistryRelative,
      line: 0,
      message: `CORE_WORKFLOW_REGISTRY_DRIFT expected=${core.join(",")} registry=${registryCore.join(",")}`,
    });
  }

  const entries = registry.entries ?? [];
  const byFile = new Map();
  for (const entry of entries) {
    const fileName = String(entry.path ?? "").split("/").pop();
    if (`${workflowsRootRelative}/${fileName}` !== entry.path) {
      violations.push({ file: workflowRegistryRelative, line: 0, message: `WORKFLOW_ENTRY_PATH_INVALID ${entry.id ?? fileName}` });
      continue;
    }
    if (byFile.has(fileName)) {
      violations.push({ file: workflowRegistryRelative, line: 0, message: `DUPLICATE_WORKFLOW_ENTRY ${fileName}` });
    }
    byFile.set(fileName, entry);

    if (entry.class === "TEMPORARY") {
      if (!entry.expiresAt || entry.expiresAt < today.toISOString().slice(0, 10)) {
        violations.push({ file: entry.path, line: 0, message: `TEMPORARY_WORKFLOW_EXPIRED ${entry.id ?? fileName}` });
      }
      if (!entry.taskId || !entry.contractHash || !entry.parentBranch) {
        violations.push({ file: entry.path, line: 0, message: `TEMPORARY_WORKFLOW_CONTRACT_INCOMPLETE ${entry.id ?? fileName}` });
      }
    }
  }

  for (const fileName of core) {
    const entry = byFile.get(fileName);
    if (!entry) {
      violations.push({ file: workflowRegistryRelative, line: 0, message: `CORE_WORKFLOW_NOT_REGISTERED ${fileName}` });
      continue;
    }
    const expectedClass = fileName === registry.privilegedWorkflow ? "PRIVILEGED" : "CORE";
    if (entry.class !== expectedClass) {
      violations.push({ file: workflowRegistryRelative, line: 0, message: `CORE_WORKFLOW_CLASS_DRIFT ${fileName} expected=${expectedClass} actual=${entry.class}` });
    }
  }

  if (registry.privilegedWorkflow && !core.includes(registry.privilegedWorkflow)) {
    violations.push({ file: workflowRegistryRelative, line: 0, message: `PRIVILEGED_WORKFLOW_NOT_IN_CORE ${registry.privilegedWorkflow}` });
  }

  const expectedFiles = [...new Set([...core, ...byFile.keys()])].sort();
  return { expectedFiles, registry, violations };
}
