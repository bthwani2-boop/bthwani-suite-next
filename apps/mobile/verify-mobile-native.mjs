import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : "";
}

const platform = readArgument("--platform").toLowerCase();
const requested = readArgument("--app");
const build = process.argv.includes("--build");
const simulator = process.argv.includes("--simulator");
const apps = requested ? [requested] : Object.keys(manifest.apps ?? {});

if (!platform || !["android", "ios"].includes(platform)) {
  throw new Error("mobile-native-verification: --platform android|ios is required");
}
if (simulator && platform !== "ios") {
  throw new Error("mobile-native-verification: --simulator is valid only with --platform ios");
}
if (simulator && !build) {
  throw new Error("mobile-native-verification: --simulator requires --build");
}
if (platform === "ios" && process.platform !== "darwin") {
  throw new Error("mobile-native-verification: iOS native verification requires macOS/Xcode");
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `bthwani-${platform}-native-`));
const worktree = path.join(temporaryRoot, "checkout");

function fail(message) {
  throw new Error(`mobile-native-verification[${platform}]: ${message}`);
}

function executableFor(command) {
  if (process.platform === "win32" && command === "pnpm") return "pnpm.cmd";
  return command;
}

function run(command, args, cwd, { capture = false, env = {} } = {}) {
  const executable = executableFor(command);
  const result = spawnSync(executable, args, {
    cwd,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: {
      ...process.env,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      ...env,
    },
    windowsHide: true,
    shell: false,
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = capture ? `\n${String(result.stderr || result.stdout || "").trim()}` : "";
    fail(`${command} ${args.join(" ")} failed with exit code ${result.status}${detail}`);
  }
  return capture ? String(result.stdout ?? "").trim() : "";
}

function firstDirectory(root, predicate) {
  if (!fs.existsSync(root)) return null;
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (!entry.isDirectory()) continue;
      if (predicate(absolute, entry.name)) return absolute;
      queue.push(absolute);
    }
  }
  return null;
}

function verifyAndroidIdentity(app, appDir, config) {
  for (const required of ["android/gradlew", "android/app/build.gradle", "android/app/src/main/AndroidManifest.xml"]) {
    if (!fs.existsSync(path.join(appDir, required))) fail(`${app}: prebuild did not create ${required}`);
  }
  const gradle = fs.readFileSync(path.join(appDir, "android/app/build.gradle"), "utf8");
  if (!gradle.includes(config.androidPackage)) {
    fail(`${app}: generated Android project does not contain canonical package ${config.androidPackage}`);
  }
}

function buildAndroid(app, appDir) {
  const androidDir = path.join(appDir, "android");
  const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  run(wrapper, [":app:assembleDebug", "--no-daemon", "--stacktrace"], androidDir, {
    env: { GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || path.join(temporaryRoot, ".gradle") },
  });
  const apk = firstDirectory(path.join(androidDir, "app/build/outputs/apk"), () => false);
  const debugApk = path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
  if (!fs.existsSync(debugApk) && !apk) fail(`${app}: Android build completed without a debug APK`);
}

function verifyIosIdentity(app, appDir, config) {
  const iosDir = path.join(appDir, "ios");
  const project = fs.readdirSync(iosDir).find((name) => name.endsWith(".xcodeproj"));
  if (!project || !fs.existsSync(path.join(iosDir, "Podfile"))) {
    fail(`${app}: iOS prebuild did not create an Xcode project and Podfile`);
  }
  const pbxproj = fs.readFileSync(path.join(iosDir, project, "project.pbxproj"), "utf8");
  if (!pbxproj.includes(config.iosBundleIdentifier)) {
    fail(`${app}: generated iOS project does not contain canonical bundle ${config.iosBundleIdentifier}`);
  }
}

function chooseIosWorkspaceAndScheme(appDir) {
  const iosDir = path.join(appDir, "ios");
  run("pod", ["install", "--silent"], iosDir);
  const workspace = fs.readdirSync(iosDir).find((name) => name.endsWith(".xcworkspace") && name !== "Pods.xcworkspace");
  if (!workspace) fail("CocoaPods did not create an application xcworkspace");
  const workspacePath = path.join(iosDir, workspace);
  const raw = run("xcodebuild", ["-list", "-json", "-workspace", workspacePath], iosDir, { capture: true });
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(`xcodebuild -list returned invalid JSON for ${workspace}`);
  }
  const schemes = parsed?.workspace?.schemes ?? [];
  const scheme = schemes.find((value) => value && !/^Pods(?:-|$)/.test(value));
  if (!scheme) fail(`${workspace}: no application scheme was found`);
  return { iosDir, workspacePath, scheme };
}

function buildIos(app, appDir, config) {
  const { iosDir, workspacePath, scheme } = chooseIosWorkspaceAndScheme(appDir);
  const derivedData = path.join(temporaryRoot, "derived-data", app);
  run("xcodebuild", [
    "-workspace", workspacePath,
    "-scheme", scheme,
    "-configuration", "Debug",
    "-sdk", "iphonesimulator",
    "-destination", "generic/platform=iOS Simulator",
    "-derivedDataPath", derivedData,
    "CODE_SIGNING_ALLOWED=NO",
    "CODE_SIGNING_REQUIRED=NO",
    "build",
  ], iosDir);
  const builtApp = firstDirectory(
    path.join(derivedData, "Build/Products"),
    (_absolute, name) => name.endsWith(".app") && !name.endsWith("Tests.app"),
  );
  if (!builtApp) fail(`${app}: Xcode build completed without an iOS Simulator .app`);
  const bundle = run(
    "/usr/libexec/PlistBuddy",
    ["-c", "Print :CFBundleIdentifier", path.join(builtApp, "Info.plist")],
    iosDir,
    { capture: true },
  );
  if (bundle !== config.iosBundleIdentifier) {
    fail(`${app}: built bundle mismatch: expected ${config.iosBundleIdentifier}, got ${bundle}`);
  }
  return builtApp;
}

function resolveSimulator() {
  const raw = run("xcrun", ["simctl", "list", "devices", "available", "-j"], repoRoot, { capture: true });
  const parsed = JSON.parse(raw);
  const candidates = [];
  for (const [runtime, devices] of Object.entries(parsed.devices ?? {})) {
    if (!runtime.includes("SimRuntime.iOS-")) continue;
    for (const device of devices ?? []) {
      if (device?.isAvailable && /^iPhone\b/.test(device.name ?? "")) candidates.push(device);
    }
  }
  if (candidates.length === 0) fail("no available iPhone Simulator is installed on this macOS runner");
  return candidates[0];
}

function launchIosSimulator(app, builtApp, config) {
  const device = resolveSimulator();
  if (device.state !== "Booted") {
    run("xcrun", ["simctl", "boot", device.udid], repoRoot);
  }
  run("xcrun", ["simctl", "bootstatus", device.udid, "-b"], repoRoot);
  run("xcrun", ["simctl", "install", device.udid, builtApp], repoRoot);
  const output = run(
    "xcrun",
    ["simctl", "launch", "--terminate-running-process", device.udid, config.iosBundleIdentifier],
    repoRoot,
    { capture: true },
  );
  if (!/:\s*\d+\s*$/.test(output)) fail(`${app}: simctl launch did not return process evidence: ${output}`);
  console.log(`mobile:ios:launch PASS app=${app} simulator=${device.name} bundle=${config.iosBundleIdentifier}`);
}

try {
  if (!fs.existsSync(manifestPath)) fail(`canonical mobile manifest is missing: ${path.relative(repoRoot, manifestPath)}`);
  for (const app of apps) {
    const config = manifest.apps?.[app];
    if (!config) fail(`unknown app '${app}'`);
    if (!config.androidPackage || !config.iosBundleIdentifier) {
      fail(`${app}: canonical Android package and iOS bundle identifier are both required`);
    }
  }

  run("git", ["worktree", "add", "--detach", worktree, "HEAD"], repoRoot);
  const sourceNodeModules = path.join(repoRoot, "node_modules");
  const targetNodeModules = path.join(worktree, "node_modules");
  if (!fs.existsSync(sourceNodeModules)) fail("root node_modules is required before native verification");
  fs.symlinkSync(sourceNodeModules, targetNodeModules, process.platform === "win32" ? "junction" : "dir");

  for (const app of apps) {
    const config = manifest.apps[app];
    const appDir = path.join(worktree, "apps", app, "runtime");
    run("pnpm", ["--dir", appDir, "exec", "expo", "prebuild", "--platform", platform, "--no-install", "--clean"], worktree);

    if (platform === "android") {
      verifyAndroidIdentity(app, appDir, config);
      console.log(`mobile:android:prebuild PASS app=${app} package=${config.androidPackage}`);
      if (build) {
        buildAndroid(app, appDir);
        console.log(`mobile:android:native-build PASS app=${app} package=${config.androidPackage}`);
      }
    } else {
      verifyIosIdentity(app, appDir, config);
      console.log(`mobile:ios:prebuild PASS app=${app} bundle=${config.iosBundleIdentifier}`);
      if (build) {
        const builtApp = buildIos(app, appDir, config);
        console.log(`mobile:ios:native-build PASS app=${app} bundle=${config.iosBundleIdentifier}`);
        if (simulator) launchIosSimulator(app, builtApp, config);
      }
    }
  }
} finally {
  spawnSync("git", ["worktree", "remove", "--force", worktree], { cwd: repoRoot, stdio: "ignore" });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
