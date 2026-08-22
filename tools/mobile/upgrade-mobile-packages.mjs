import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolvePackageManagerInvocation } from "../scripts/lib/package-manager-invocation.mjs";

const require = createRequire(import.meta.url);
const { validateMobileFeatureCapabilityManifest } = require("./mobile-feature-capability-model.js");
const { validateMobileDependencyClosure } = require("./mobile-dependency-closure.js");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const targetIndex = process.argv.indexOf("--target-sdk");
const targetSdk = targetIndex >= 0 ? Number(process.argv[targetIndex + 1]) : NaN;
const apply = process.argv.includes("--apply");
const stabilizeUiKit = process.argv.includes("--stabilize-ui-kit");

function fail(message) {
  throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(path.join(repoRoot, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(command, args, cwd = repoRoot, options = {}) {
  const environment = {
    ...process.env,
    CI: options.ci === false ? process.env.CI : "1",
    EXPO_NO_TELEMETRY: "1",
    COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  };
  const invocation = resolvePackageManagerInvocation(command, args, environment);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: environment,
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    if (options.capture) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    fail(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }
  return options.capture ? (result.stdout ?? "") : "";
}

function versionMajor(specifier) {
  if (typeof specifier !== "string") return null;
  const match = specifier.match(/(?:^|[^0-9])(\d+)\./);
  return match ? Number(match[1]) : null;
}

function assertCleanGit() {
  const result = spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error) fail(`git status could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`git status failed with exit ${result.status}`);
  if ((result.stdout ?? "").trim()) fail("working tree must be clean before package modernization");
}

function snapshot(relativePaths) {
  return new Map(relativePaths.map((relativePath) => [
    relativePath,
    fs.readFileSync(path.join(repoRoot, relativePath)),
  ]));
}

function restore(files) {
  for (const [relativePath, content] of files) {
    fs.writeFileSync(path.join(repoRoot, relativePath), content);
  }
}

function assertSdkConvergence(manifest, appKeys) {
  validateMobileFeatureCapabilityManifest(manifest);
  validateMobileDependencyClosure(manifest, repoRoot);
  const packages = appKeys.map((appKey) => [appKey, readJson(`apps/${appKey}/runtime/package.json`)]);
  const baseline = packages[0];
  for (const dependency of ["expo", "react", "react-native"]) {
    const baselineSpecifier = baseline[1].dependencies?.[dependency];
    for (const [appKey, pkg] of packages.slice(1)) {
      if (pkg.dependencies?.[dependency] !== baselineSpecifier) {
        fail(`${appKey}: ${dependency} did not converge with ${baseline[0]}`);
      }
    }
  }
  return baseline[1];
}

function alignUiKitCoreVersions(appPackage) {
  const uiKitPath = "shared/ui-kit/package.json";
  const uiKit = readJson(uiKitPath);
  const react = appPackage.dependencies.react;
  const reactNative = appPackage.dependencies["react-native"];
  if (!react || !reactNative) fail("upgraded app package is missing react/react-native");

  if (uiKit.peerDependencies?.react) uiKit.peerDependencies.react = react;
  if (uiKit.peerDependencies?.["react-dom"]) uiKit.peerDependencies["react-dom"] = react;
  if (uiKit.peerDependencies?.["react-native"]) uiKit.peerDependencies["react-native"] = reactNative;
  if (uiKit.devDependencies?.["react-native"]) uiKit.devDependencies["react-native"] = reactNative;
  if (uiKit.devDependencies?.["@react-native/metro-config"]) uiKit.devDependencies["@react-native/metro-config"] = reactNative;
  writeJson(uiKitPath, uiKit);
}

if (!Number.isInteger(targetSdk)) {
  console.error("Usage: node tools/mobile/upgrade-mobile-packages.mjs --target-sdk 57 [--stabilize-ui-kit] [--apply]");
  process.exit(2);
}
if (targetSdk !== 57) fail(`only the governed SDK 57 transition is prepared; requested ${targetSdk}`);

const manifestPath = "tools/mobile/mobile-apps.manifest.json";
const manifest = readJson(manifestPath);
validateMobileFeatureCapabilityManifest(manifest);
validateMobileDependencyClosure(manifest, repoRoot);
const appKeys = Object.keys(manifest.apps);
const currentSdk = manifest.global.expoSdk;
const currentUiKit = readJson("shared/ui-kit/package.json");
const uiKitHasPrerelease = Object.entries(currentUiKit.dependencies ?? {})
  .filter(([name]) => name === "tamagui" || name.startsWith("@tamagui/"))
  .some(([, specifier]) => typeof specifier === "string" && specifier.includes("-"));
if (uiKitHasPrerelease && !stabilizeUiKit) {
  fail("ui-kit still uses Tamagui prerelease packages; SDK 57 modernization requires --stabilize-ui-kit");
}

const needsSdkUpgrade = currentSdk !== targetSdk;
if (needsSdkUpgrade && currentSdk + 1 !== targetSdk) {
  fail(`SDK upgrade must be sequential: current=${currentSdk} target=${targetSdk}`);
}
if (!needsSdkUpgrade && !uiKitHasPrerelease) {
  console.log(`PASS: mobile packages already declare Expo SDK ${targetSdk} and ui-kit is not prerelease`);
  process.exit(0);
}

if (!apply) {
  console.log(needsSdkUpgrade
    ? `READY: Expo SDK ${currentSdk} -> ${targetSdk}`
    : `READY: Expo SDK ${targetSdk} is already declared; ui-kit stabilization remains`);
  console.log(`apps=${appKeys.join(",")}`);
  console.log(`ui-kit=${stabilizeUiKit ? "stabilize Tamagui v2 before final verification" : "preserve current Tamagui versions"}`);
  console.log("No EAS build will be started by this command.");
  process.exit(0);
}

assertCleanGit();
const trackedFiles = [
  manifestPath,
  "pnpm-lock.yaml",
  "shared/ui-kit/package.json",
  ...appKeys.map((appKey) => `apps/${appKey}/runtime/package.json`),
];
const originals = snapshot(trackedFiles);

try {
  if (stabilizeUiKit && uiKitHasPrerelease) {
    run("pnpm", [
      "--filter", "@bthwani/ui-kit", "up",
      "tamagui@^2",
      "@tamagui/config@^2",
      "@tamagui/animations-react-native@^2",
    ]);
  }

  if (needsSdkUpgrade) {
    for (const appKey of appKeys) {
      const appDir = path.join(repoRoot, "apps", appKey, "runtime");
      run("pnpm", ["--dir", appDir, "exec", "expo", "install", `expo@^${targetSdk}.0.0`]);
      run("pnpm", ["--dir", appDir, "exec", "expo", "install", "--fix"]);
      const pkg = readJson(`apps/${appKey}/runtime/package.json`);
      if (versionMajor(pkg.dependencies?.expo) !== targetSdk) {
        fail(`${appKey}: Expo CLI did not move package.json to SDK ${targetSdk}`);
      }
    }

    manifest.global.expoSdk = targetSdk;
    writeJson(manifestPath, manifest);
  }

  const upgradedBaseline = assertSdkConvergence(readJson(manifestPath), appKeys);
  alignUiKitCoreVersions(upgradedBaseline);

  run("pnpm", ["install", "--lockfile-only"]);
  run("pnpm", ["install", "--frozen-lockfile"]);
  run("pnpm", ["run", "mobile:apps:check"]);
  run("pnpm", ["run", "mobile:expo:verify"]);
  for (const appKey of appKeys) {
    run("pnpm", ["--dir", path.join(repoRoot, "apps", appKey, "runtime"), "dlx", "expo-doctor@latest"]);
  }
  assertSdkConvergence(readJson(manifestPath), appKeys);

  console.log(`PASS: package modernization completed for Expo SDK ${targetSdk}`);
  console.log("No EAS build was started. Commit the verified package/lockfile changes before any manual remote build.");
} catch (error) {
  restore(originals);
  console.error(`ROLLBACK: restored governed package files after failure: ${error.message}`);
  process.exit(1);
}
