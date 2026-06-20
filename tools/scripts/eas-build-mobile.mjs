import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const [appKey, profile = "development", platform = "android"] = process.argv.slice(2);

const commonEnv = {
  ...process.env,
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  EAS_SKIP_AUTO_FINGERPRINT: "1"
};

function bin(command) {
  if (process.platform === "win32" && command === "pnpm") {
    return "pnpm.cmd";
  }

  return command;
}

function fail(message) {
  console.error("FAIL:", message);
  process.exit(1);
}

function run(command, args, options) {
  const result = spawnSync(bin(command), args, {
    ...options,
    shell: false,
    env: commonEnv
  });

  if (result.error) {
    fail(`${command} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

if (!appKey) {
  fail("usage: pnpm run mobile:eas:build -- <app-key> <profile> <platform>");
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "tools/mobile/mobile-apps.manifest.json"), "utf8")
);

if (!manifest.apps[appKey]) {
  fail(`unknown app: ${appKey}`);
}

if (!["development", "internal", "production"].includes(profile)) {
  fail(`invalid profile: ${profile}`);
}

if (!["android", "ios", "all"].includes(platform)) {
  fail(`invalid platform: ${platform}`);
}

const dir = path.join(root, "apps", appKey, "runtime");

run(process.execPath, ["tools/scripts/guard-mobile-apps.mjs"], {
  cwd: root,
  stdio: "inherit"
});

run(
  "pnpm",
  [
    "dlx",
    "eas-cli@latest",
    "build",
    "--platform",
    platform,
    "--profile",
    profile,
    "--clear-cache",
    "--non-interactive"
  ],
  {
    cwd: dir,
    stdio: "inherit"
  }
);
