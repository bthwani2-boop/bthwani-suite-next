import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"));
const requestedIndex = process.argv.indexOf("--app");
const requested = requestedIndex >= 0 ? process.argv[requestedIndex + 1] : "";
const apps = requested ? [requested] : Object.keys(manifest.apps ?? {});
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-native-prebuild-"));
const worktree = path.join(temporaryRoot, "checkout");

function fail(message) {
  throw new Error(`mobile-native-verification: ${message}`);
}

function run(command, args, cwd) {
  const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" },
    windowsHide: true,
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

try {
  for (const app of apps) if (!manifest.apps?.[app]) fail(`unknown app '${app}'`);
  run("git", ["worktree", "add", "--detach", worktree, "HEAD"], repoRoot);
  const sourceNodeModules = path.join(repoRoot, "node_modules");
  const targetNodeModules = path.join(worktree, "node_modules");
  if (!fs.existsSync(sourceNodeModules)) fail("root node_modules is required before native verification");
  fs.symlinkSync(sourceNodeModules, targetNodeModules, process.platform === "win32" ? "junction" : "dir");

  for (const app of apps) {
    const appDir = path.join(worktree, "apps", app, "runtime");
    run("pnpm", ["--dir", appDir, "exec", "expo", "prebuild", "--platform", "android", "--no-install", "--clean"], worktree);
    for (const required of ["android/gradlew", "android/app/build.gradle"]) {
      if (!fs.existsSync(path.join(appDir, required))) fail(`${app}: prebuild did not create ${required}`);
    }
    console.log(`mobile-native-verification: PASS app=${app}`);
  }
} finally {
  spawnSync("git", ["worktree", "remove", "--force", worktree], { cwd: repoRoot, stdio: "ignore" });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
