import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);

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

if (!["android", "ios", "all"].includes(platform)) {
  throw new Error("--platform must be android, ios, or all");
}
if (all && requestedApp) {
  throw new Error("Use either --all or --app, not both");
}
if (!all && !requestedApp) {
  throw new Error("Use --app <app-key> or --all");
}

const appKeys = Object.keys(manifest.apps);
const targets = all ? appKeys : [requestedApp];

for (const key of targets) {
  if (!manifest.apps[key]) {
    throw new Error(`Unknown app '${key}'. Allowed: ${appKeys.join(", ")}`);
  }
}

function resolveInvocation(command, args) {
  if (command !== "pnpm") {
    return { executable: command, args };
  }

  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) {
    throw new Error("npm_execpath is unavailable. Run the EAS runner through a pnpm script.");
  }

  return {
    executable: process.execPath,
    args: [pnpmCli, ...args],
  };
}

function run(command, args, cwd = root, env = process.env) {
  console.log(`\n> ${command} ${args.join(" ")}`);

  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, ["tools/scripts/sync-mobile-apps.mjs", "--check"]);
run(process.execPath, [
  "tools/scripts/guard-mobile-apps.mjs",
  "--require-build-secrets",
  "--platform",
  platform,
]);

for (const key of targets) {
  const appDir = path.join(root, "apps", key, "runtime");

  run("pnpm", ["typecheck"], appDir);

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
  run("pnpm", args, appDir);
}
