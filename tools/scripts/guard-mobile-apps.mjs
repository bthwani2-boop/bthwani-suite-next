import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requireBuildSecrets = process.argv.includes("--require-build-secrets");
const platformArgIndex = process.argv.indexOf("--platform");
const platform = platformArgIndex >= 0 ? process.argv[platformArgIndex + 1] : "android";

if (!["android", "ios", "all"].includes(platform)) {
  console.error("FAIL: --platform must be android, ios, or all");
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function fail(message) {
  console.error("FAIL:", message);
  process.exit(1);
}

function resolveInvocation(command, args) {
  if (command !== "pnpm") {
    return { executable: command, args };
  }

  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) {
    fail("npm_execpath is unavailable. Run this guard through a pnpm script.");
  }

  return {
    executable: process.execPath,
    args: [pnpmCli, ...args],
  };
}

function run(command, args, cwd) {
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    shell: false,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    },
  });

  if (result.error) {
    fail(`${command} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    fail(`${command} ${args.join(" ")} failed`);
  }

  return result.stdout ?? "";
}

function pluginNames(plugins) {
  return new Set(
    (plugins ?? []).map((plugin) => Array.isArray(plugin) ? plugin[0] : plugin),
  );
}

const manifest = readJson("tools/mobile/mobile-apps.manifest.json");
const rootPkg = readJson("package.json");

if (rootPkg.packageManager !== `pnpm@${manifest.global.pnpm}`) {
  fail(`root packageManager must be pnpm@${manifest.global.pnpm}`);
}
if (rootPkg.engines?.node !== `>=${manifest.global.node} <25`) {
  fail("root node engine mismatch");
}
if (rootPkg.engines?.pnpm !== manifest.global.pnpm) {
  fail(`root pnpm engine must be ${manifest.global.pnpm}`);
}
if (rootPkg.pnpm) {
  fail("root package.json must not contain pnpm config; use pnpm-workspace.yaml");
}

for (const [key, app] of Object.entries(manifest.apps)) {
  const dir = path.join(root, "apps", key, "runtime");
  const pkg = readJson(path.join("apps", key, "runtime", "package.json"));
  const eas = readJson(path.join("apps", key, "runtime", "eas.json"));
  const features = app.features ?? [];

  if (pkg.devDependencies?.typescript !== "~6.0.3") {
    fail(`${key}: TypeScript must be ~6.0.3`);
  }
  if (pkg.scripts?.typecheck !== "tsc --noEmit -p tsconfig.json") {
    fail(`${key}: typecheck must be strict and must not suppress failures`);
  }

  if (eas.build?.base?.node !== manifest.global.node) {
    fail(`${key}: EAS node must be ${manifest.global.node}`);
  }
  if (eas.build?.base?.pnpm !== manifest.global.pnpm) {
    fail(`${key}: EAS pnpm must be ${manifest.global.pnpm}`);
  }
  if (Object.prototype.hasOwnProperty.call(eas.build?.base?.env ?? {}, "EAS_SKIP_AUTO_FINGERPRINT")) {
    fail(`${key}: EAS_SKIP_AUTO_FINGERPRINT is forbidden`);
  }
  if (eas.build?.development?.environment !== "development") {
    fail(`${key}: development profile must use development environment`);
  }
  if (eas.build?.internal?.environment !== "preview") {
    fail(`${key}: internal profile must use preview environment`);
  }
  if (eas.build?.production?.environment !== "production") {
    fail(`${key}: production profile must use production environment`);
  }
  if (eas.build?.development?.developmentClient !== true) {
    fail(`${key}: developmentClient must be true`);
  }
  if (eas.build?.development?.distribution !== "internal") {
    fail(`${key}: development distribution must be internal`);
  }
  if (eas.build?.development?.android?.buildType !== "apk") {
    fail(`${key}: development android.buildType must be apk`);
  }
  if (eas.build?.production?.android?.buildType !== "app-bundle") {
    fail(`${key}: production android.buildType must be app-bundle`);
  }

  const raw = run("pnpm", ["--dir", dir, "exec", "expo", "config", "--json"], root);
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) {
    fail(`${key}: expo config did not return JSON`);
  }

  const expo = JSON.parse(raw.slice(jsonStart));
  if (expo.name !== app.name) fail(`${key}: name mismatch`);
  if (expo.slug !== app.slug) fail(`${key}: slug mismatch`);
  if (expo.owner !== manifest.global.owner) fail(`${key}: owner mismatch`);
  if (expo.scheme !== app.scheme) fail(`${key}: scheme mismatch`);
  if (expo.entryPoint !== "./index.js") fail(`${key}: entryPoint mismatch`);
  if (expo.android?.package !== app.androidPackage) fail(`${key}: android package mismatch`);
  if (expo.ios?.bundleIdentifier !== app.iosBundleIdentifier) fail(`${key}: ios bundleIdentifier mismatch`);
  if (expo.extra?.appKey !== key) fail(`${key}: extra.appKey mismatch`);
  if (expo.extra?.appLine !== manifest.global.appLine) fail(`${key}: extra.appLine mismatch`);
  if (expo.extra?.sourceRepo !== manifest.global.sourceRepo) fail(`${key}: extra.sourceRepo mismatch`);
  if (expo.extra?.eas?.projectId !== app.projectId) fail(`${key}: EAS projectId mismatch`);

  if (Array.isArray(expo.platforms) && expo.platforms.includes("web")) {
    fail(`${key}: web is forbidden in Expo mobile config`);
  }

  const names = pluginNames(expo.plugins);
  for (const basePlugin of ["expo-image-picker", "expo-document-picker"]) {
    if (!names.has(basePlugin)) fail(`${key}: missing ${basePlugin} plugin`);
  }

  const featurePlugins = {
    camera: "expo-camera",
    video: "expo-video",
    location: "expo-location",
    notifications: "expo-notifications",
    secureStore: "expo-secure-store",
  };

  for (const [feature, plugin] of Object.entries(featurePlugins)) {
    if (features.includes(feature) && !names.has(plugin)) {
      fail(`${key}: feature '${feature}' requires plugin '${plugin}'`);
    }
  }

  const featureDependencies = {
    camera: "expo-camera",
    video: "expo-video",
    location: "expo-location",
    maps: "react-native-maps",
    notifications: "expo-notifications",
    secureStore: "expo-secure-store",
  };

  for (const [feature, dependency] of Object.entries(featureDependencies)) {
    if (features.includes(feature) && !pkg.dependencies?.[dependency]) {
      fail(`${key}: feature '${feature}' requires dependency '${dependency}'`);
    }
  }

  if (requireBuildSecrets && features.includes("maps")) {
    if ((platform === "android" || platform === "all") &&
        !process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim()) {
      fail(`${key}: GOOGLE_MAPS_ANDROID_API_KEY is required for ${platform} build preflight`);
    }
    if ((platform === "ios" || platform === "all") &&
        !process.env.GOOGLE_MAPS_IOS_API_KEY?.trim()) {
      fail(`${key}: GOOGLE_MAPS_IOS_API_KEY is required for ${platform} build preflight`);
    }
  }
}

const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
if (!workspace.includes("apps/*/runtime")) {
  fail("pnpm-workspace.yaml must include apps/*/runtime");
}
if (!workspace.includes("allowBuilds:")) {
  fail("pnpm-workspace.yaml must define allowBuilds");
}
if (workspace.includes("onlyBuiltDependencies")) {
  fail("pnpm-workspace.yaml must not use onlyBuiltDependencies");
}
if (workspace.includes("ignoredBuiltDependencies")) {
  fail("pnpm-workspace.yaml must not use ignoredBuiltDependencies");
}

console.log("PASS: mobile Expo/EAS configuration is centrally guarded");
