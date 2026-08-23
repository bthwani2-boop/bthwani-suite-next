// Canonical Metro configuration for Expo mobile apps.
// Expo SDK 52+ configures workspace/monorepo resolution automatically. Keep
// package resolution under Expo/Metro authority instead of maintaining
// compatibility resolvers or parallel node_modules maps that can drift from
// pnpm's materialized graph.
const { spawnSync } = require("node:child_process");

function runWatchman(args) {
  return spawnSync("watchman", args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertWindowsWatchmanAvailable(projectRoot) {
  if (process.platform !== "win32") return;

  const version = runWatchman(["version"]);
  if (version.error || version.status !== 0) {
    const detail = version.error?.message || version.stderr?.trim() || `exit ${version.status}`;
    throw new Error(
      "BThwani mobile runtime requires a healthy Watchman installation on Windows. " +
        "The Expo Node watcher opens one OS handle per watched directory in Windows monorepos and is unsafe for this workspace. " +
        `Install or repair Watchman before starting Metro. (${detail})`,
    );
  }

  // Prove the daemon can establish the actual repository watch before Metro is
  // allowed to start. This prevents a missing/broken Watchman installation from
  // silently sending Metro back to the unsafe Node watcher on Windows.
  const watchProject = runWatchman(["watch-project", projectRoot]);
  if (watchProject.error || watchProject.status !== 0) {
    const detail = watchProject.error?.message || watchProject.stderr?.trim() || `exit ${watchProject.status}`;
    throw new Error(
      "BThwani mobile runtime could not establish a Watchman project watch on Windows. " +
        `Metro startup is blocked rather than falling back to the Node watcher. (${detail})`,
    );
  }
}

function createBthwaniMetroConfig(projectRoot) {
  const { getSentryExpoConfig } = require(require.resolve("@sentry/react-native/metro", { paths: [projectRoot] }));

  // Drop-in replacement for Expo's getDefaultConfig. It adds Debug IDs and
  // source-map metadata used by Sentry for EAS Build and EAS Update bundles.
  const config = getSentryExpoConfig(projectRoot);

  // Windows monorepos must not use Expo's default Node watcher. It creates one
  // OS handle per watched directory and has already produced ~15.8k handles per
  // Metro process in this workspace. Watchman uses recursive roots instead.
  if (process.platform === "win32") {
    assertWindowsWatchmanAvailable(projectRoot);
    config.resolver ??= {};
    config.resolver.useWatchman = true;
  }

  return config;
}

module.exports = { createBthwaniMetroConfig };
