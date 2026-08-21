// Metro configuration factory for Expo in the pnpm monorepo.
const path = require("path");

function createBthwaniMetroConfig(projectRoot) {
  const workspaceRoot = path.resolve(projectRoot, "../../..");
  const { getSentryExpoConfig } = require(require.resolve("@sentry/react-native/metro", { paths: [projectRoot] }));

  // Drop-in replacement for Expo's getDefaultConfig. It adds Debug IDs and
  // source-map metadata used by Sentry for EAS Build and EAS Update bundles.
  const config = getSentryExpoConfig(projectRoot);

  config.watchFolders = [
    workspaceRoot,
  ];

  // Resolve packages from their real workspace owners instead of requiring
  // every mobile runtime to repeat transitive implementation dependencies.
  config.resolver.nodeModulesPaths = [
    path.join(projectRoot, "node_modules"),
    path.join(workspaceRoot, "shared/ui-kit/node_modules"),
    path.join(workspaceRoot, "shared/data-runtime/node_modules"),
    path.join(workspaceRoot, "core/identity/node_modules"),
    path.join(workspaceRoot, "services/dsh/node_modules"),
    path.join(workspaceRoot, "node_modules"),
  ];

  // Only singleton/runtime-provider dependencies are pinned to the app root.
  // Implementation dependencies owned by workspace packages resolve from the
  // owner paths above, preventing package.json supersets in every app.
  config.resolver.extraNodeModules = {
    "@bthwani/ui-kit": path.join(workspaceRoot, "shared/ui-kit"),
    "@bthwani/data-runtime": path.join(workspaceRoot, "shared/data-runtime"),
    "@bthwani/core-identity": path.join(workspaceRoot, "core/identity"),
    react: path.join(projectRoot, "node_modules/react"),
    "react-native": path.join(projectRoot, "node_modules/react-native"),
    "react-native-safe-area-context": path.join(projectRoot, "node_modules/react-native-safe-area-context"),
    tamagui: path.join(workspaceRoot, "shared/ui-kit/node_modules/tamagui"),
    "@tamagui/config": path.join(workspaceRoot, "shared/ui-kit/node_modules/@tamagui/config"),
    "@tamagui/animations-react-native": path.join(workspaceRoot, "shared/ui-kit/node_modules/@tamagui/animations-react-native"),
    "@tanstack/react-query": path.join(workspaceRoot, "shared/data-runtime/node_modules/@tanstack/react-query"),
  };

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
