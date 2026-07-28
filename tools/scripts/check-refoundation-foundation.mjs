import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const policyRelative =
  "governance/refoundation/foundation-protection.policy.json";
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return null;
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} drift: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function expectNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
}

function expectMarker(content, marker, label) {
  if (content !== null && !content.includes(marker)) {
    fail(`${label} is missing protected marker: ${marker}`);
  }
}

function rejectMarker(content, marker, label) {
  if (content !== null && content.includes(marker)) {
    fail(`${label} contains forbidden marker: ${marker}`);
  }
}

function runGit(argumentsList) {
  const result = spawnSync("git", argumentsList, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) {
    fail(`Git execution failed: ${result.error.message}`);
    return null;
  }
  if (result.status !== 0) {
    fail(
      `Git command failed: git ${argumentsList.join(" ")}\n${(result.stderr || result.stdout || "").trim()}`,
    );
    return null;
  }
  return result.stdout.trim();
}

function isFoundationChangeAllowed(relativePath, scope) {
  if ((scope.allowedExactFiles ?? []).includes(relativePath)) return true;
  if ((scope.allowedPrefixes ?? []).some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }
  for (const source of scope.allowedPatterns ?? []) {
    try {
      if (new RegExp(source).test(relativePath)) return true;
    } catch (error) {
      fail(`Invalid foundation change pattern ${source}: ${error.message}`);
    }
  }
  return false;
}

function validateEasConfig(eas, easPath, policy) {
  if (!eas) return;
  expectEqual(eas.cli?.appVersionSource, "remote", `${easPath} appVersionSource`);
  expectEqual(eas.cli?.requireCommit, true, `${easPath} requireCommit`);
  expectEqual(
    eas.build?.base?.node,
    policy.lockedToolchain?.nodeRuntime,
    `${easPath} base Node`,
  );
  expectEqual(
    eas.build?.base?.pnpm,
    policy.lockedToolchain?.pnpm,
    `${easPath} base pnpm`,
  );

  for (const profile of ["development", "internal", "production"]) {
    if (!eas.build?.[profile]) {
      fail(`${easPath} is missing EAS build profile: ${profile}`);
    }
  }

  expectEqual(
    eas.build?.development?.developmentClient,
    true,
    `${easPath} developmentClient`,
  );
  expectEqual(
    eas.build?.development?.distribution,
    "internal",
    `${easPath} development distribution`,
  );
  expectEqual(
    eas.build?.development?.android?.buildType,
    "apk",
    `${easPath} development Android buildType`,
  );
  expectEqual(
    eas.build?.internal?.distribution,
    "internal",
    `${easPath} internal distribution`,
  );
  expectEqual(
    eas.build?.internal?.android?.buildType,
    "apk",
    `${easPath} internal Android buildType`,
  );
  expectEqual(
    eas.build?.production?.autoIncrement,
    true,
    `${easPath} production autoIncrement`,
  );
  expectEqual(
    eas.build?.production?.android?.buildType,
    "app-bundle",
    `${easPath} production Android buildType`,
  );
}

const policy = readJson(policyRelative);

if (policy) {
  expectEqual(policy.schemaVersion, 2, "foundation policy schemaVersion");
  expectEqual(policy.branch, "new", "foundation policy branch");
  expectEqual(policy.sourceBranch, "abdo", "foundation policy sourceBranch");
  expectEqual(policy.phase, "FOUNDATION_ONLY", "foundation policy phase");
  expectEqual(policy.journeysAllowed, false, "foundation policy journeysAllowed");
  expectNonEmptyString(policy.sourceCommit, "foundation policy sourceCommit");

  for (const requiredFile of policy.requiredFiles ?? []) {
    readText(requiredFile);
  }
}

const packageJson = readJson("package.json");
if (policy && packageJson) {
  const expected = policy.lockedToolchain ?? {};
  expectEqual(packageJson.packageManager, expected.packageManager, "packageManager");
  expectEqual(packageJson.engines?.node, expected.nodeEngine, "Node engine");
  expectEqual(packageJson.engines?.pnpm, expected.pnpm, "pnpm engine");
  expectEqual(
    packageJson.devDependencies?.typescript,
    expected.typescript,
    "TypeScript dependency",
  );

  for (const [scriptName, expectedCommand] of Object.entries(
    policy.requiredPackageScripts ?? {},
  )) {
    expectEqual(
      packageJson.scripts?.[scriptName],
      expectedCommand,
      `package script ${scriptName}`,
    );
  }
}

if (policy) {
  expectEqual(
    readText(".nvmrc")?.trim(),
    policy.lockedToolchain.nodeRuntime,
    ".nvmrc Node version",
  );
  expectEqual(
    readText(".node-version")?.trim(),
    policy.lockedToolchain.nodeRuntime,
    ".node-version Node version",
  );
  expectEqual(
    readText(".go-version")?.trim(),
    policy.lockedToolchain.go,
    ".go-version Go version",
  );
}

const toolchainMirror = readJson("shared/config/toolchain-lock.json");
if (policy && toolchainMirror) {
  expectEqual(toolchainMirror.status, "ACTIVE_MIRROR", "toolchain mirror status");
  expectEqual(
    toolchainMirror.locked?.node,
    policy.lockedToolchain.nodeRuntime,
    "toolchain mirror Node",
  );
  expectEqual(
    toolchainMirror.locked?.pnpm,
    policy.lockedToolchain.pnpm,
    "toolchain mirror pnpm",
  );
  expectEqual(
    toolchainMirror.locked?.typescript,
    policy.lockedToolchain.typescript,
    "toolchain mirror TypeScript",
  );
  expectEqual(
    toolchainMirror.locked?.go,
    policy.lockedToolchain.go,
    "toolchain mirror Go",
  );
  expectEqual(
    toolchainMirror.root?.packageManager,
    policy.lockedToolchain.packageManager,
    "toolchain mirror packageManager",
  );
  expectEqual(
    toolchainMirror.root?.engines?.node,
    policy.lockedToolchain.nodeEngine,
    "toolchain mirror Node engine",
  );
  expectEqual(
    toolchainMirror.root?.engines?.pnpm,
    policy.lockedToolchain.pnpm,
    "toolchain mirror pnpm engine",
  );
  expectEqual(
    toolchainMirror.rules?.mirrorCannotOverrideLiveManifest,
    true,
    "toolchain mirror authority boundary",
  );
}

const workspaceText = readText("pnpm-workspace.yaml");
if (policy && workspaceText) {
  for (const workspaceEntry of policy.requiredWorkspaceEntries ?? []) {
    const quotedDouble = `- "${workspaceEntry}"`;
    const quotedSingle = `- '${workspaceEntry}'`;
    const unquoted = `- ${workspaceEntry}`;
    if (
      !workspaceText.includes(quotedDouble) &&
      !workspaceText.includes(quotedSingle) &&
      !workspaceText.includes(unquoted)
    ) {
      fail(`pnpm workspace is missing required entry: ${workspaceEntry}`);
    }
  }
}

const nxJson = readJson("nx.json");
if (nxJson) {
  expectNonEmptyString(nxJson.defaultBase, "nx defaultBase");
  if (nxJson.targetDefaults?.typecheck?.cache !== true) {
    fail("Nx typecheck cache must remain enabled");
  }
  if (nxJson.targetDefaults?.build?.cache !== true) {
    fail("Nx build cache must remain enabled");
  }
}

const mobileManifest = readJson("tools/mobile/mobile-apps.manifest.json");
if (policy && mobileManifest) {
  const expectedManifest = policy.mobileManifest ?? {};
  expectEqual(mobileManifest.global?.owner, expectedManifest.owner, "mobile manifest owner");
  expectEqual(mobileManifest.global?.appLine, expectedManifest.appLine, "mobile manifest appLine");
  expectEqual(
    mobileManifest.global?.sourceRepo,
    expectedManifest.sourceRepo,
    "mobile manifest sourceRepo",
  );
  expectEqual(
    mobileManifest.global?.node,
    policy.lockedToolchain?.nodeRuntime,
    "mobile manifest Node runtime",
  );
  expectEqual(
    mobileManifest.global?.pnpm,
    policy.lockedToolchain?.pnpm,
    "mobile manifest pnpm runtime",
  );

  const seenProjectIds = new Set();
  const seenAndroidPackages = new Set();
  const seenIosBundles = new Set();

  for (const [appKey, expectedApp] of Object.entries(
    expectedManifest.apps ?? {},
  )) {
    const app = mobileManifest.apps?.[appKey];
    if (!app) {
      fail(`Mobile manifest is missing required app: ${appKey}`);
      continue;
    }

    expectNonEmptyString(app.name, `mobile manifest ${appKey}.name`);
    for (const field of [
      "slug",
      "scheme",
      "androidPackage",
      "iosBundleIdentifier",
      "projectId",
    ]) {
      expectEqual(app[field], expectedApp[field], `mobile manifest ${appKey}.${field}`);
    }

    if (!Array.isArray(app.features) || app.features.length === 0) {
      fail(`Mobile manifest ${appKey}.features must be a non-empty array`);
    }
    for (const requiredFeature of ["router", "updates", "secureStore"]) {
      if (!app.features.includes(requiredFeature)) {
        fail(`Mobile manifest ${appKey}.features is missing ${requiredFeature}`);
      }
    }

    for (const [value, set, label] of [
      [app.projectId, seenProjectIds, "EAS projectId"],
      [app.androidPackage, seenAndroidPackages, "Android package"],
      [app.iosBundleIdentifier, seenIosBundles, "iOS bundle identifier"],
    ]) {
      if (set.has(value)) fail(`Duplicate ${label}: ${value}`);
      set.add(value);
    }

    const appConfigPath = `apps/${appKey}/runtime/app.config.ts`;
    const appConfig = readText(appConfigPath);
    if (appConfig && !appConfig.includes(`defineBthwaniExpoApp("${appKey}")`)) {
      fail(`${appConfigPath} must use the central Expo application definition`);
    }

    const easPath = `apps/${appKey}/runtime/eas.json`;
    validateEasConfig(readJson(easPath), easPath, policy);
  }

  validateEasConfig(
    readJson("tools/mobile/eas.template.json"),
    "tools/mobile/eas.template.json",
    policy,
  );
}

const expoDefinition = readText("tools/mobile/defineBthwaniExpoApp.js");
if (expoDefinition) {
  for (const marker of [
    "expo-router",
    "expo-updates",
    "expo-notifications",
    "expo-secure-store",
    "@sentry/react-native/expo",
    "react-native-maps",
  ]) {
    expectMarker(expoDefinition, marker, "Central Expo definition");
  }
}

if (policy) {
  const setupAction = readText(".github/actions/setup-node-workspace/action.yml");
  expectMarker(
    setupAction,
    `default: "${policy.lockedToolchain.nodeRuntime}"`,
    "Node workspace setup action",
  );
  expectMarker(
    setupAction,
    `default: "${policy.lockedToolchain.pnpm}"`,
    "Node workspace setup action",
  );
  expectMarker(
    setupAction,
    "pnpm install --frozen-lockfile",
    "Node workspace setup action",
  );

  const lockfileWorkflow = readText(".github/workflows/lockfile-snapshot.yml");
  expectMarker(
    lockfileWorkflow,
    `version: ${policy.lockedToolchain.pnpm}`,
    "Lockfile workflow",
  );
  expectMarker(
    lockfileWorkflow,
    `node-version: "${policy.lockedToolchain.nodeRuntime}"`,
    "Lockfile workflow",
  );
}

const compose = readText("infra/docker/compose.runtime.yml");
if (policy && compose) {
  for (const requiredToken of policy.requiredDockerMarkers ?? []) {
    expectMarker(compose, requiredToken, "Docker runtime foundation");
  }
}

const runtimeScript = readText("infra/docker/scripts/runtime.ps1");
if (runtimeScript) {
  for (const marker of [
    'ValidateSet("up", "down", "reset", "status", "logs", "migrate", "seed", "smoke", "doctor", "all", "bootstrap-dev", "verify-catalog")',
    "identity, workforce, dsh, media, wlt, financial-simulators, mail, cache",
  ]) {
    expectMarker(runtimeScript, marker, "Docker runtime orchestrator");
  }
}

if (policy) {
  const goModules = [
    "services/dsh/backend/go.mod",
    "services/wlt/backend/go.mod",
    "core/identity/backend/go.mod",
    "core/workforce/backend/go.mod",
    "core/providers/backend/go.mod",
    "core/platform-control/backend/go.mod",
  ];
  for (const goModule of goModules) {
    expectMarker(
      readText(goModule),
      `go ${policy.lockedToolchain.go}`,
      goModule,
    );
  }

  const dockerfiles = [
    "services/dsh/backend/Dockerfile",
    "services/wlt/backend/Dockerfile",
    "core/identity/backend/Dockerfile",
    "core/workforce/backend/Dockerfile",
    "core/providers/backend/Dockerfile",
    "core/platform-control/backend/Dockerfile",
  ];
  for (const dockerfile of dockerfiles) {
    const content = readText(dockerfile);
    expectMarker(
      content,
      `FROM golang:${policy.lockedToolchain.go}-alpine AS build`,
      dockerfile,
    );
    rejectMarker(content, ":latest", dockerfile);
    expectMarker(content, "USER app", dockerfile);
  }
}

const gitignore = readText(".gitignore");
if (gitignore) {
  for (const forbidden of ["**/*.md", "**/*.txt"]) {
    rejectMarker(gitignore, forbidden, ".gitignore");
  }
}
const graphifyIgnore = readText(".graphifyignore");
if (graphifyIgnore) {
  for (const required of ["**/*.md", "**/*.txt", "governance/", ".agents/"]) {
    expectMarker(graphifyIgnore, required, ".graphifyignore");
  }
}

if (policy?.journeysAllowed === false) {
  const insideWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);
  if (insideWorkTree === "true") {
    runGit(["merge-base", "--is-ancestor", policy.sourceCommit, "HEAD"]);
    const changedOutput = runGit([
      "diff",
      "--name-only",
      `${policy.sourceCommit}..HEAD`,
    ]);
    if (changedOutput !== null) {
      const changedFiles = changedOutput
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);
      for (const changedFile of changedFiles) {
        if (!isFoundationChangeAllowed(changedFile, policy.foundationChangeScope ?? {})) {
          fail(
            `FOUNDATION_ONLY scope violation: ${changedFile} is outside the permitted foundation and environment paths`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Refoundation foundation check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Refoundation foundation check passed: phase=${policy.phase}, files=${policy.requiredFiles.length}, mobileApps=${Object.keys(policy.mobileManifest.apps).length}, journeysAllowed=${policy.journeysAllowed}.`,
);
