// Canonical Metro configuration for Expo mobile apps.
// Expo SDK 52+ configures workspace/monorepo resolution automatically. Keep
// package resolution under Expo/Metro authority instead of maintaining
// compatibility resolvers or parallel node_modules maps that can drift from
// pnpm's materialized graph.
const { spawnSync } = require("node:child_process");

const WATCHMAN_REQUIRED_CAPABILITIES = [
  "field-content.sha1hex",
  "relative_root",
  "suffix-set",
  "wildmatch",
];

function runWatchman(args) {
  return spawnSync("watchman", args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function formatWatchmanFailure(result) {
  return result.error?.message || result.stderr?.trim() || `exit ${result.status}`;
}

function assertWindowsWatchmanAvailable(projectRoot) {
  if (process.platform !== "win32") return;

  // Mirror the capability contract used by @expo/metro-file-map itself. Metro
  // is allowed to start only when the installed Watchman can satisfy every
  // capability required by Expo's file-map implementation.
  const capabilitiesResult = runWatchman([
    "list-capabilities",
    "--output-encoding=json",
    "--no-pretty",
    "--no-spawn",
  ]);
  if (capabilitiesResult.error || capabilitiesResult.status !== 0) {
    throw new Error(
      "BThwani mobile runtime requires a healthy Watchman installation on Windows. " +
        "The Expo Node watcher opens one OS handle per watched directory in Windows monorepos and is unsafe for this workspace. " +
        `Metro startup is blocked rather than falling back to the Node watcher. (${formatWatchmanFailure(capabilitiesResult)})`,
    );
  }

  let capabilitiesPayload;
  try {
    capabilitiesPayload = JSON.parse(capabilitiesResult.stdout || "{}");
  } catch (error) {
    throw new Error(
      "BThwani mobile runtime could not parse Watchman capability output on Windows. " +
        `Metro startup is blocked rather than falling back to the Node watcher. (${error.message})`,
    );
  }

  const availableCapabilities = new Set(
    Array.isArray(capabilitiesPayload.capabilities) ? capabilitiesPayload.capabilities : [],
  );
  const missingCapabilities = WATCHMAN_REQUIRED_CAPABILITIES.filter(
    (capability) => !availableCapabilities.has(capability),
  );
  if (typeof capabilitiesPayload.version !== "string" || missingCapabilities.length > 0) {
    const detail =
      missingCapabilities.length > 0
        ? `missing capabilities: ${missingCapabilities.join(", ")}`
        : "Watchman did not report a valid version";
    throw new Error(
      "BThwani mobile runtime rejected an incompatible Watchman installation on Windows. " +
        `Metro startup is blocked rather than falling back to the Node watcher. (${detail})`,
    );
  }

  // Prove the daemon can establish the actual repository watch before Metro is
  // allowed to start. This prevents daemon, permission, or filesystem failures
  // from silently sending Metro back to the unsafe Node watcher on Windows.
  const watchProject = runWatchman(["watch-project", projectRoot]);
  if (watchProject.error || watchProject.status !== 0) {
    throw new Error(
      "BThwani mobile runtime could not establish a Watchman project watch on Windows. " +
        `Metro startup is blocked rather than falling back to the Node watcher. (${formatWatchmanFailure(watchProject)})`,
    );
  }
}

function createBthwaniMetroConfig(projectRoot) {
  const { getSentryExpoConfig } = require(require.resolve("@sentry/react-native/metro", { paths: [projectRoot] }));

  // Drop-in replacement for Expo's getDefaultConfig. It adds Debug IDs and
  // source-map metadata used by Sentry for EAS Build and EAS Update bundles.
  const config = getSentryExpoConfig(projectRoot);

  // Windows monorepos must not use Expo's Node watcher. It creates one OS
  // handle per watched directory and produced ~15.8k handles per Metro process
  // in this workspace. Watchman owns recursive filesystem watching instead.
  if (process.platform === "win32") {
    assertWindowsWatchmanAvailable(projectRoot);
    config.resolver ??= {};
    config.resolver.useWatchman = true;
  }

  return config;
}

module.exports = { createBthwaniMetroConfig };
