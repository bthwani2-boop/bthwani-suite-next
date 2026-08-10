import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

function hasMaterializeDependency(target) {
  return (target?.dependsOn ?? []).some((dependency) =>
    dependency &&
    typeof dependency === "object" &&
    dependency.target === "materialize" &&
    Array.isArray(dependency.projects) &&
    dependency.projects.length === 1 &&
    dependency.projects[0] === "contracts",
  );
}

test("generated OpenAPI artifacts remain derived and untracked", () => {
  const gitignore = read(".gitignore");
  assert.match(gitignore, /\*\*\/contracts\/generated\/\*\.bundle\.openapi\.yaml/);
  assert.match(gitignore, /\*\*\/clients\/generated\/\*-api\.ts/);
});

test("Nx verification targets materialize contracts before parallel work", () => {
  const nx = readJson("nx.json");
  for (const targetName of ["typecheck", "build", "lint", "test"]) {
    assert.equal(
      hasMaterializeDependency(nx.targetDefaults?.[targetName]),
      true,
      `${targetName} must depend on contracts:materialize`,
    );
  }

  const contractsProject = readJson("contracts/project.json");
  assert.equal(contractsProject.targets?.materialize?.cache, false);
  assert.equal(
    contractsProject.targets?.materialize?.options?.command,
    "node tools/scripts/materialize-openapi-artifacts.mjs",
  );
});

test("materialization is freshness-aware and postinstall delegates to it", () => {
  const materializer = read("tools/scripts/materialize-openapi-artifacts.mjs");
  for (const marker of [
    "sourceDigests",
    "pnpm-lock.yaml",
    "generated-client-registry.json",
    "materializationKey",
    "currentArtifactHashes",
    "openapi:generate:all",
    ".artifacts/openapi/materialization.json",
  ]) {
    assert.match(materializer, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const postinstall = read("tools/scripts/postinstall-generate-clients.mjs");
  assert.match(postinstall, /materialize-openapi-artifacts\.mjs/);
  assert.doesNotMatch(postinstall, /spawnSync|shell\s*:/);
});

test("contract verification composes from sovereign sources instead of requiring committed bundles", () => {
  const typecheck = read("tools/scripts/contracts/typecheck.mjs");
  assert.match(typecheck, /composeContext\(context, \{ write: false \}\)/);
  assert.doesNotMatch(typecheck, /committed bundle|readFileSync\(new URL\(result\.bundlePath/);
});

test("central Node command runners stay shell-free", () => {
  for (const relativePath of [
    "tools/scripts/run-command-check.mjs",
    "tools/scripts/run-tsc-check.mjs",
    "tools/scripts/run-affected-verification.mjs",
    "tools/guards/generated-client-provenance-gate.mjs",
  ]) {
    const source = read(relativePath);
    assert.match(source, /resolvePackageManagerInvocation/);
    assert.doesNotMatch(source, /shell\s*:\s*process\.platform\s*===\s*["']win32["']/);
    assert.doesNotMatch(source, /pnpm\.cmd/);
  }
});
