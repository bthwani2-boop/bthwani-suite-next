import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolvePackageManagerInvocation } from "./lib/package-manager-invocation.mjs";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);
const platformArgIndex = process.argv.indexOf("--platform");
const platform = platformArgIndex >= 0 ? process.argv[platformArgIndex + 1] : "android";
const requestedAppIndex = process.argv.indexOf("--app");
const requestedApp = requestedAppIndex >= 0 ? process.argv[requestedAppIndex + 1] : undefined;

if (!["android", "ios", "all"].includes(platform)) {
  throw new Error("--platform must be android, ios, or all");
}
const appKeys = requestedApp ? [requestedApp] : Object.keys(manifest.apps);
for (const appKey of appKeys) {
  if (!manifest.apps[appKey]) throw new Error(`unknown mobile app: ${appKey}`);
}

function run(command, args, cwd, { capture = false, environment = process.env } = {}) {
  const invocation = resolvePackageManagerInvocation(command, args, environment);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
    windowsHide: true,
    env: environment,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = capture ? `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() : "";
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}${details ? `\n${details}` : ""}`);
  }
  return capture ? String(result.stdout ?? "").trim() : "";
}

function runPnpm(args, cwd) {
  const environment = {
    ...process.env,
    CI: "1",
    EXPO_NO_TELEMETRY: "1",
    COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  };
  run("pnpm", args, cwd, { environment });
}

function trackedStatus() {
  return run("git", ["status", "--porcelain=v1", "--untracked-files=no"], root, { capture: true });
}

function assertTrackedTreeClean(stage) {
  const status = trackedStatus();
  if (status) {
    throw new Error(`${stage} requires a clean tracked Git tree. Modified files:\n${status}`);
  }
}

function restorePrebuildTrackedFiles(appKey) {
  const appPath = `apps/${appKey}/runtime`;
  run("git", [
    "restore",
    "--worktree",
    "--source=HEAD",
    "--",
    appPath,
    "package.json",
    "pnpm-lock.yaml",
  ], root);
}

function nativeDirsFor(targetPlatform) {
  if (targetPlatform === "all") return ["android", "ios"];
  return [targetPlatform];
}

assertTrackedTreeClean("Expo prebuild verification");

for (const appKey of appKeys) {
  const appDir = path.join(root, "apps", appKey, "runtime");
  const nativeDirs = nativeDirsFor(platform);
  for (const nativeDir of nativeDirs) {
    const absolute = path.join(appDir, nativeDir);
    if (fs.existsSync(absolute)) {
      throw new Error(`${appKey}: ${nativeDir}/ must not exist before CNG prebuild verification`);
    }
  }

  try {
    runPnpm(
      ["exec", "expo", "prebuild", "--clean", "--no-install", "--platform", platform],
      appDir,
    );
    if (platform === "android" || platform === "all") {
      for (const relative of [
        "android/settings.gradle",
        "android/app/build.gradle",
        "android/app/src/main/AndroidManifest.xml",
      ]) {
        if (!fs.existsSync(path.join(appDir, relative))) {
          throw new Error(`${appKey}: Expo prebuild did not generate ${relative}`);
        }
      }
    }
    if (platform === "ios" || platform === "all") {
      const iosDir = path.join(appDir, "ios");
      if (!fs.existsSync(iosDir) || !fs.readdirSync(iosDir).some((name) => name.endsWith(".xcodeproj"))) {
        throw new Error(`${appKey}: Expo prebuild did not generate an iOS project`);
      }
    }
  } finally {
    for (const nativeDir of nativeDirs) {
      fs.rmSync(path.join(appDir, nativeDir), { recursive: true, force: true });
    }
    restorePrebuildTrackedFiles(appKey);
  }

  assertTrackedTreeClean(`Expo prebuild cleanup for ${appKey}`);
}

console.log(`PASS: clean, side-effect-free Expo ${platform} prebuild verified for ${appKeys.join(", ")}`);
