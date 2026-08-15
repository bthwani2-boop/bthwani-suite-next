import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appIndex = process.argv.indexOf("--app");
const appKey = appIndex >= 0 ? process.argv[appIndex + 1] : "";
const manifestPath = path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json");
const readinessContractPath = path.join(repoRoot, "infra/docker/runtime-readiness.contract.json");
const mobileBootstrapPath = path.join(repoRoot, "apps/mobile/ensure-mobile-dev-runtime.ps1");
const frontendReadinessPath = path.join(repoRoot, "tools/scripts/check-frontend-binding-readiness.mjs");
const runtimeAuthorityPath = path.join(repoRoot, "infra/docker/scripts/runtime.ps1");
const runtimeEnvPath = path.join(repoRoot, "infra/docker/env/runtime.env.example");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const app = manifest.apps?.[appKey];
const appDir = path.join(repoRoot, "apps", appKey, "runtime");

function fail(message) {
  console.error(`mobile-runtime-contract: ${message}`);
  process.exit(1);
}

function requireRepoFile(file, label = path.relative(repoRoot, file)) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`missing ${label}`);
  return fs.readFileSync(file, "utf8");
}

function requireFile(relative) {
  const absolute = path.join(appDir, relative);
  if (!fs.existsSync(absolute)) fail(`${appKey}: missing ${relative}`);
}

function requireMarker(label, text, marker) {
  if (!text.includes(marker)) fail(`${label}: missing governed marker ${marker}`);
}

function validateSharedRuntimeReadinessContract() {
  const contractText = requireRepoFile(readinessContractPath);
  let contract;
  try {
    contract = JSON.parse(contractText);
  } catch (error) {
    fail(`runtime readiness contract is invalid JSON: ${error.message}`);
  }
  if (contract.schemaVersion !== 1) fail(`runtime readiness schemaVersion must be 1, got ${contract.schemaVersion}`);

  const expectedMobileProfiles = ["identity", "workforce", "dsh", "wlt", "media"];
  const actualMobileProfiles = contract.bundles?.mobileDevelopment;
  if (JSON.stringify(actualMobileProfiles) !== JSON.stringify(expectedMobileProfiles)) {
    fail(`mobileDevelopment readiness bundle drift: expected=${expectedMobileProfiles.join(",")} actual=${(actualMobileProfiles ?? []).join(",")}`);
  }
  const frontendDefault = contract.bundles?.frontendDefault;
  if (!Array.isArray(frontendDefault) || frontendDefault.length === 0) fail("frontendDefault readiness bundle must be non-empty");

  for (const [bundleName, profiles] of Object.entries(contract.bundles ?? {})) {
    if (!Array.isArray(profiles) || profiles.length === 0) fail(`readiness bundle '${bundleName}' must be non-empty`);
    if (new Set(profiles).size !== profiles.length) fail(`readiness bundle '${bundleName}' contains duplicate profiles`);
    for (const profile of profiles) {
      if (!contract.profiles?.[profile]) fail(`readiness bundle '${bundleName}' references unknown profile '${profile}'`);
    }
  }

  const runtimeText = requireRepoFile(runtimeAuthorityPath);
  const runtimeEnvText = requireRepoFile(runtimeEnvPath);
  for (const [profile, definition] of Object.entries(contract.profiles ?? {})) {
    if (!definition.name || !definition.kind || !definition.path) fail(`readiness profile '${profile}' is incomplete`);
    requireMarker("runtime.ps1", runtimeText, definition.path);

    if (definition.kind === "json-status") {
      if (!definition.baseUrlEnv || !definition.defaultBaseUrl) fail(`json-status profile '${profile}' needs baseUrlEnv/defaultBaseUrl`);
      if (!Array.isArray(definition.healthyStatuses) || definition.healthyStatuses.length === 0) {
        fail(`json-status profile '${profile}' needs healthyStatuses`);
      }
      requireMarker("runtime.env.example", runtimeEnvText, `${definition.baseUrlEnv}=`);
      for (const status of definition.healthyStatuses) requireMarker("runtime.ps1", runtimeText, String(status));
    } else if (definition.kind === "http-ok") {
      if (!definition.host || !definition.portEnv || definition.defaultPort === undefined) {
        fail(`http-ok profile '${profile}' needs host/portEnv/defaultPort`);
      }
      requireMarker("runtime.env.example", runtimeEnvText, `${definition.portEnv}=`);
      requireMarker("runtime.ps1", runtimeText, definition.portEnv);
    } else {
      fail(`readiness profile '${profile}' has unsupported kind '${definition.kind}'`);
    }
  }

  const bootstrapText = requireRepoFile(mobileBootstrapPath);
  for (const marker of [
    "runtime-readiness.contract.json",
    "bundles.mobileDevelopment",
    "Test-BthwaniRuntimeProfileReadiness",
    "Test-BthwaniMobileBackend",
  ]) requireMarker("ensure-mobile-dev-runtime.ps1", bootstrapText, marker);
  for (const forbidden of ["/workforce/health", "/dsh/health"]) {
    if (bootstrapText.includes(forbidden)) fail(`ensure-mobile-dev-runtime.ps1: liveness-only mobile readiness is forbidden (${forbidden})`);
  }

  const frontendText = requireRepoFile(frontendReadinessPath);
  for (const marker of [
    "runtime-readiness.contract.json",
    '"frontendDefault"',
    "healthyStatuses.includes",
    "BTHWANI_FRONTEND_READINESS_BUNDLE",
  ]) requireMarker("check-frontend-binding-readiness.mjs", frontendText, marker);

  return contract;
}

validateSharedRuntimeReadinessContract();

if (!app) fail(`unknown app '${appKey || "<none>"}'`);
for (const file of ["package.json", "index.js", "src/index.ts", "eas.json", "metro.config.cjs", "tsconfig.json"]) {
  requireFile(file);
}
if (!["app.config.js", "app.config.ts", "app.json"].some((file) => fs.existsSync(path.join(appDir, file)))) {
  fail(`${appKey}: missing Expo app configuration`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"));
for (const script of ["typecheck", "lint", "test:app", "test:runtime", "test", "build", "eas-build-pre-install"]) {
  if (!pkg.scripts?.[script]) fail(`${appKey}: missing required script '${script}'`);
}

const expectedTestApp = "node --test tests/*.test.mjs";
const expectedTestRuntime = `node ../../mobile/test-mobile-runtime-contract.mjs --app ${appKey}`;
const expectedTest = "pnpm run test:app && pnpm run test:runtime";
if (pkg.scripts["test:app"] !== expectedTestApp) fail(`${appKey}: test:app must run the complete owned test suite`);
if (pkg.scripts["test:runtime"] !== expectedTestRuntime) fail(`${appKey}: test:runtime command drift`);
if (pkg.scripts.test !== expectedTest) fail(`${appKey}: test must fail closed across app and runtime layers`);

const testsDir = path.join(appDir, "tests");
if (!fs.existsSync(testsDir)) fail(`${appKey}: missing tests directory`);
const testFiles = fs.readdirSync(testsDir).filter((name) => name.endsWith(".test.mjs"));
if (testFiles.length === 0) fail(`${appKey}: no owned test files`);
if (!testFiles.some((name) => name.endsWith(".execution.test.mjs"))) {
  fail(`${appKey}: at least one executable logic test (*.execution.test.mjs) is required`);
}

// The runtime contract is itself a governed pnpm package script. Reuse the
// exact pnpm CLI that launched this process and execute it through Node. This
// avoids shell parsing entirely on Windows and keeps arguments unambiguous.
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli || !fs.existsSync(pnpmCli)) {
  fail(`${appKey}: governed pnpm CLI path is unavailable; run the canonical package test instead of invoking this contract through a shell`);
}

const result = spawnSync(
  process.execPath,
  [pnpmCli, "--dir", appDir, "exec", "expo", "config", "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" },
    windowsHide: true,
  },
);
if (result.error) fail(`${appKey}: Expo config could not start: ${result.error.message}`);
if (result.status !== 0) {
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  fail(`${appKey}: Expo config failed`);
}
const jsonStart = (result.stdout ?? "").indexOf("{");
if (jsonStart < 0) fail(`${appKey}: Expo config returned no JSON`);
const config = JSON.parse(result.stdout.slice(jsonStart));
if (config.extra?.appKey !== appKey) fail(`${appKey}: extra.appKey mismatch`);
if (config.android?.package !== app.androidPackage) fail(`${appKey}: Android package mismatch`);
if (config.ios?.bundleIdentifier !== app.iosBundleIdentifier) fail(`${appKey}: iOS bundle identifier mismatch`);
if (config.extra?.eas?.projectId !== app.projectId) fail(`${appKey}: EAS project ID mismatch`);
if (config.entryPoint !== "./index.js") fail(`${appKey}: entry point mismatch`);
console.log(`mobile-runtime-contract: PASS app=${appKey}`);
