import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

function runPnpm(args, cwd) {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) throw new Error("npm_execpath is unavailable; run through pnpm");
  const result = spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function nativeDirsFor(targetPlatform) {
  if (targetPlatform === "all") return ["android", "ios"];
  return [targetPlatform];
}

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
  }
}

console.log(`PASS: clean Expo ${platform} prebuild verified for ${appKeys.join(", ")}`);
