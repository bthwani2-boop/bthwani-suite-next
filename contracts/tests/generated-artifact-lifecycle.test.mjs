import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { composeContext } from "../../tools/scripts/openapi-context-composer.mjs";
import { generatedClientEntries } from "../../tools/scripts/contract-client-metadata.mjs";

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

test("bounded-context manifests are the only generated-client metadata source", () => {
  const entries = generatedClientEntries();
  assert.deepEqual(
    [...new Set(entries.map((entry) => entry.context))].sort(),
    ["dsh", "identity", "platform-control", "providers", "wlt", "workforce"],
  );
  assert.equal(new Set(entries.map((entry) => entry.client)).size, 7);
  assert.equal(new Set(entries.map((entry) => entry.contract)).size, 6);
  for (const entry of entries) {
    const manifest = read(entry.manifest);
    assert.match(manifest, /client:\s+.+/);
    assert.match(manifest, /regenerateScript:\s+pnpm run [A-Za-z0-9:_-]+/);
    if (entry.mode === "OPENAPI_GO") assert.match(manifest, /mode:\s+OPENAPI_GO/);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, "tools/verification/generated-client-registry.json")), false);
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

test("materialization freshness binds sources, composed output, toolchain and actual artifact hashes", () => {
  const materializer = read("tools/scripts/materialize-openapi-artifacts.mjs");
  for (const marker of [
    "sourceDigests",
    "bundleDigests",
    "toolchainDigests",
    "materializerPath",
    "composerPath",
    "contract-client-metadata.mjs",
    "clientMetadataDigest",
    "identityGoModulePath",
    "GOVERSION",
    "GOTOOLCHAIN",
    "goToolchain",
    "pnpm-lock.yaml",
    "materializationKey",
    "currentArtifactHashes",
    "sameHashes",
    ".artifacts/openapi/materialization.json",
  ]) {
    assert.match(materializer, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(materializer, /openapiTS\(pathToFileURL\(contractPath\)\)/);
  assert.match(materializer, /toolchainDigests,\s*\n\}\)\);/);
  assert.doesNotMatch(materializer, /spawnSync|openapi:generate:all|shell\s*:/);

  const packageJson = readJson("package.json");
  assert.equal(Object.hasOwn(packageJson.scripts ?? {}, "postinstall"), false);
  const workspaceAction = read(".github/actions/setup-node-workspace/action.yml");
  assert.match(workspaceAction, /pnpm install --frozen-lockfile --prefer-offline --ignore-scripts/);
  assert.doesNotMatch(workspaceAction, /materialize_generated|postinstall/);
});

test("contract verification composes from sovereign sources instead of requiring committed bundles", () => {
  const typecheck = read("tools/scripts/contracts/typecheck.mjs");
  assert.match(typecheck, /composeContext\(context, \{ write: false \}\)/);
  assert.doesNotMatch(typecheck, /committed bundle|readFileSync\(new URL\(result\.bundlePath/);
});

test("DSH modular composition does not materialize stale payout-destination self-references", async () => {
  const result = await composeContext("dsh", { write: false });
  for (const pathPointer of [
    "~1dsh~1captain~1me~1finance~1payout-destination~1deactivate",
    "~1dsh~1field~1me~1finance~1payout-destination~1deactivate",
    "~1dsh~1partner~1me~1finance~1payout-destination~1deactivate",
  ]) {
    assert.doesNotMatch(result.bundle, new RegExp(`#/paths/${pathPointer}`));
  }
});

test("Redocly contract lint stays hermetic while preserving real lint enforcement", () => {
  const typecheck = read("tools/scripts/contracts/typecheck.mjs");
  assert.match(typecheck, /REDOCLY_SUPPRESS_UPDATE_NOTICE:\s*"true"/);
  assert.match(typecheck, /REDOCLY_TELEMETRY:\s*"off"/);
  assert.match(typecheck, /env:\s*redoclyEnvironment/);
  assert.match(typecheck, /"redocly",\s*"lint"/s);
  assert.match(typecheck, /rejectWarnings:\s*true/);
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
