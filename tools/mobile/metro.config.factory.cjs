// Canonical Metro configuration for Expo mobile apps.
// Expo SDK 52+ configures workspace/monorepo resolution automatically. Keep
// package resolution under Expo/Metro authority instead of maintaining
// compatibility resolvers or parallel node_modules maps that can drift from
// pnpm's materialized graph.
function createBthwaniMetroConfig(projectRoot) {
  const { getSentryExpoConfig } = require(require.resolve("@sentry/react-native/metro", { paths: [projectRoot] }));

  // Drop-in replacement for Expo's getDefaultConfig. It adds Debug IDs and
  // source-map metadata used by Sentry for EAS Build and EAS Update bundles.
  return getSentryExpoConfig(projectRoot);
}

module.exports = { createBthwaniMetroConfig };
