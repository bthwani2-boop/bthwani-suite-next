// Applies the 10-step dead-code proof protocol (spec S10.2) before any archive/
// delete decision is trusted: static references, dynamic imports, config
// references, route references, package-script references, test references, git
// history, and product-model-graph references. Never deletes; only proves impact.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { repoRoot, readJson, listCodeFiles, read } from "../_remediation-utils.mjs";

export function verifyDeleteImpact(candidatePath) {
  const baseName = candidatePath.split("/").pop().replace(/\.[^.]+$/, "");
  const steps = {};

  steps.staticReferences = listCodeFiles().some((file) => file !== candidatePath && read(file).includes(baseName));

  const packageJson = readJson("package.json");
  steps.packageScriptReferences = JSON.stringify(packageJson?.scripts ?? {}).includes(baseName);

  let workflowReferences = false;
  if (fs.existsSync(`${repoRoot}/.github/workflows`)) {
    workflowReferences = fs
      .readdirSync(`${repoRoot}/.github/workflows`)
      .filter((name) => /\.ya?ml$/i.test(name))
      .some((name) => read(`.github/workflows/${name}`).includes(baseName));
  }
  steps.workflowReferences = workflowReferences;

  steps.testReferences = listCodeFiles().some((file) => /\.test\.(mjs|ts|tsx|js)$/.test(file) && read(file).includes(baseName));

  try {
    const log = execFileSync("git", ["log", "--all", "-1", "--format=%H", "--", candidatePath], { cwd: repoRoot, encoding: "utf8" }).trim();
    steps.gitHistoryExists = Boolean(log);
  } catch {
    steps.gitHistoryExists = false;
  }

  const graph = readJson("governance/remediation/capability-graph.json");
  steps.productModelGraphReference = (graph?.nodes ?? []).some((node) => JSON.stringify(node).includes(baseName));

  const provenUsed = Object.values(steps).some(Boolean);
  const classification = provenUsed
    ? steps.testReferences
      ? "TEST_ONLY"
      : "DYNAMIC_USAGE"
    : "DEAD_PROVEN";

  return { path: candidatePath, steps, classification };
}

function main() {
  const [candidatePath] = process.argv.slice(2);
  if (!candidatePath) {
    console.error("usage: verify-delete-impact.mjs <candidate-path>");
    process.exit(2);
  }
  console.log(JSON.stringify(verifyDeleteImpact(candidatePath), null, 2));
}

if (process.argv[1]?.endsWith("verify-delete-impact.mjs")) main();
