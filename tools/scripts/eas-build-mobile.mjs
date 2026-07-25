import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolvePackageManagerInvocation } from "./lib/package-manager-invocation.mjs";

const require = createRequire(import.meta.url);
const {
  appEnvSuffix,
  resolveSentryEnvironment,
  withSentryEnvironmentForApp,
} = require("../mobile/sentry-env.js");

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);

function importEnvironmentFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [rawName, ...rawValueParts] = line.split("=");
    const name = rawName.trim();
    if (!name) continue;
    let value = rawValueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]?.trim()) process.env[name] = value;
  }
}

importEnvironmentFile(path.join(root, "infra/local/mobile.env"));

function valueAfter(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const requestedApp = valueAfter("--app", null);
const platform = valueAfter("--platform", "android");
const profile = valueAfter("--profile", "development");
const all = process.argv.includes("--all");
const clearCache = process.argv.includes("--clear-cache");
const nonInteractive = process.argv.includes("--non-interactive");
const skipExport = process.argv.includes("--skip-local-export");
const skipPreflight = process.argv.includes("--skip-preflight");
const preflightOnly = process.argv.includes("--preflight-only");

if (["--skip-preflight", "--preflight-only"].every((flag) => process.argv.includes(flag))) {
  throw new Error("Use either --skip-preflight or --preflight-only, not both");
}
if (!["android", "ios", "all"].includes(platform)) throw new Error("--platform must be android, ios, or all");
if (!["development", "internal", "production"].includes(profile)) throw new Error("--profile must be development, internal, or production");
if (all && requestedApp) throw new Error("Use either --all or --app, not both");
if (!all && !requestedApp) throw new Error("Use --app <app-key> or --all");

const appKeys = Object.keys(manifest.apps);
const targets = all ? appKeys : [requestedApp];
for (const key of targets) {
  if (!manifest.apps[key]) throw new Error(`Unknown app '${key}'. Allowed: ${appKeys.join(", ")}`);
}

function resolveInvocation(command, args, environment) {
  return resolvePackageManagerInvocation(command, args, environment);
}

function run(command, args, cwd = root, env = process.env) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const environment = { ...env, CI: "1", EXPO_NO_TELEMETRY: "1" };
  const invocation = resolveInvocation(command, args, environment);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: environment,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function optionalEnvironmentValue(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function withMobileBuildEnvironmentForApp(appKey, environment = process.env) {
  const next = withSentryEnvironmentForApp(appKey, environment);
  const suffix = appEnvSuffix(appKey);
  for (const name of [
    "GOOGLE_SERVICES_JSON",
    "GOOGLE_MAPS_ANDROID_API_KEY",
    "GOOGLE_MAPS_IOS_API_KEY",
  ]) {
    const scoped = optionalEnvironmentValue(environment[`${name}_${suffix}`]);
    const common = optionalEnvironmentValue(environment[name]);
    const value = scoped ?? common;
    if (value) next[name] = value;
    else delete next[name];
  }
  return next;
}

function requireNativeProviderInputs(appKey, app, environment) {
  const features = app.features ?? [];
  if (!features.includes("maps")) return;

  if ((platform === "android" || platform === "all")
    && !optionalEnvironmentValue(environment.GOOGLE_MAPS_ANDROID_API_KEY)) {
    throw new Error(`${appKey}: GOOGLE_MAPS_ANDROID_API_KEY is required for ${profile}/${platform} because the app enables native maps`);
  }

  if ((platform === "ios" || platform === "all")
    && !optionalEnvironmentValue(environment.GOOGLE_MAPS_IOS_API_KEY)) {
    throw new Error(`${appKey}: GOOGLE_MAPS_IOS_API_KEY is required for ${profile}/${platform} because the app enables native maps`);
  }
}

if (!skipPreflight) {
  console.log("=== PHASE 1: Target App Preflight ===");

  const syncArgs = ["tools/scripts/sync-mobile-apps.mjs", "--check"];
  if (!all && requestedApp) syncArgs.push("--app", requestedApp);
  run(process.execPath, syncArgs);
  run(process.execPath, ["tools/scripts/guard-mobile-expo-sdk56-versions.mjs"]);

  if (all && (platform === "android" || platform === "all")) {
    run(process.execPath, [
      "tools/scripts/guard-google-platform-prebuild.mjs",
      "--project",
      "bthwani-platform",
    ]);
  }

  if (all && profile !== "development") {
    const projects = new Map();
    for (const key of targets) {
      const sentry = resolveSentryEnvironment(key, process.env);
      if (!sentry.project) continue;
      const existing = projects.get(sentry.project);
      if (existing) {
        throw new Error(`Sentry project '${sentry.project}' is shared by ${existing} and ${key}. Use one project per mobile application for release and source-map isolation.`);
      }
      projects.set(sentry.project, key);
    }
  }

  for (const key of targets) {
    const appDir = path.join(root, "apps", key, "runtime");
    const appEnvironment = withMobileBuildEnvironmentForApp(key, process.env);
    requireNativeProviderInputs(key, manifest.apps[key], appEnvironment);

    run(process.execPath, [
      "tools/scripts/verify-mobile-sentry-env.mjs",
      "--app",
      key,
      "--profile",
      profile,
    ], root, appEnvironment);

    run(process.execPath, [
      "tools/scripts/guard-mobile-apps.mjs",
      "--app",
      key,
      "--require-build-secrets",
      "--platform",
      platform,
      "--profile",
      profile,
    ], root, appEnvironment);

    run("pnpm", ["typecheck"], appDir, appEnvironment);
    run("npx", ["--yes", "expo-doctor@latest"], appDir, appEnvironment);

    if (!skipExport) {
      const outputDir = path.join(root, ".tmp", "eas-preflight", key, platform);
      fs.rmSync(outputDir, { recursive: true, force: true });
      run("pnpm", ["exec", "expo", "export", "--platform", platform, "--output-dir", outputDir], appDir, appEnvironment);
    }

    run(process.execPath, [
      "tools/scripts/verify-mobile-prebuild.mjs",
      "--app",
      key,
      "--platform",
      platform,
    ], root, appEnvironment);
  }

  console.log("\nPASS: All target app preflight checks completed successfully!");
} else {
  console.log("=== PHASE 1: Target App Preflight Skipped ===");
  console.log("--skip-preflight was requested. Submit build only for the selected target app.");
}

if (preflightOnly) {
  console.log("Preflight-only mode requested. Skipping remote builds.");
  process.exit(0);
}

console.log("\n=== PHASE 2: Remote EAS Build Submission ===");

for (const key of targets) {
  console.log(`\nSubmitting remote build for '${key}'...`);
  const appDir = path.join(root, "apps", key, "runtime");
  const appEnvironment = withMobileBuildEnvironmentForApp(key, process.env);

  const args = [
    "dlx",
    "eas-cli@latest",
    "build",
    "--platform",
    platform,
    "--profile",
    profile,
  ];
  if (clearCache) args.push("--clear-cache");
  if (nonInteractive) args.push("--non-interactive");

  // Expo requires EAS commands to run from each app root in a monorepo.
  run("pnpm", args, appDir, appEnvironment);
}
