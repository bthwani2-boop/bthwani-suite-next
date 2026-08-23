// Canonical Metro configuration for Expo mobile apps.
// Expo SDK 52+ configures workspace/monorepo resolution automatically. Keep
// package resolution under Expo/Metro authority instead of maintaining
// compatibility resolvers or parallel node_modules maps that can drift from
// pnpm's materialized graph.
const { spawnSync } = require("node:child_process");

function assertWindowsWatchmanAvailable() {
  if (process.platform !== "win32") return;

  const result = spawnSync("watchman", ["version"], {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.trim() || `exit ${result.status}`;
    throw new Error(
      "BThwani mobile runtime requires a healthy Watchman installation on Windows. " +
        "The Expo Node watcher opens one OS handle per watched directory in Windows monorepos and is unsafe for this workspace. " +
        `Install or repair Watchman before starting Metro. (${detail})`,
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
    assertWindowsWatchmanAvailable();
    config.resolver ??= {};
    config.resolver.useWatchman = true;
  }

  return config;
}

module.exports = { createBthwaniMetroConfig };
