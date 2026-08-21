// Canonical Metro configuration for Expo mobile apps.
// Expo SDK 52+ configures workspace/monorepo resolution automatically. Keep
// package resolution under Expo/Metro authority instead of maintaining a
// parallel node_modules map that can drift from pnpm's materialized graph.
function createBthwaniMetroConfig(projectRoot) {
  const { getSentryExpoConfig } = require(require.resolve("@sentry/react-native/metro", { paths: [projectRoot] }));

  // Drop-in replacement for Expo's getDefaultConfig. It adds Debug IDs and
  // source-map metadata used by Sentry for EAS Build and EAS Update bundles.
  const config = getSentryExpoConfig(projectRoot);

  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.endsWith(".js") && !moduleName.startsWith("http")) {
      try {
        return context.resolveRequest(context, moduleName.slice(0, -3), platform);
      } catch {
        // Fall through to Sentry/Expo's resolver with the original module name.
      }
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
}

module.exports = { createBthwaniMetroConfig };
