// Metro configuration for Expo in the pnpm monorepo (isolated linker).
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../../..");

// Drop-in replacement for Expo's getDefaultConfig. It adds Debug IDs and
// source-map metadata used by Sentry for EAS Build and EAS Update bundles.
const config = getSentryExpoConfig(projectRoot);

config.watchFolders = [
  projectRoot,
  path.join(workspaceRoot, "services/dsh"),
  path.join(workspaceRoot, "shared/ui-kit"),
  path.join(workspaceRoot, "shared/app-shell"),
  path.join(workspaceRoot, "shared/data-runtime"),
  path.join(workspaceRoot, "core/identity"),
];

config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  "@bthwani/ui-kit": path.join(workspaceRoot, "shared/ui-kit"),
  "@bthwani/app-shell": path.join(workspaceRoot, "shared/app-shell"),
  "@bthwani/data-runtime": path.join(workspaceRoot, "shared/data-runtime"),
  "@bthwani/core-identity": path.join(workspaceRoot, "core/identity"),
  react: path.join(projectRoot, "node_modules/react"),
  "react-native": path.join(projectRoot, "node_modules/react-native"),
  "react-native-safe-area-context": path.join(projectRoot, "node_modules/react-native-safe-area-context"),
  "react-native-svg": path.join(projectRoot, "node_modules/react-native-svg"),
  "react-native-screens": path.join(projectRoot, "node_modules/react-native-screens"),
  "react-native-gesture-handler": path.join(projectRoot, "node_modules/react-native-gesture-handler"),
  "react-native-reanimated": path.join(projectRoot, "node_modules/react-native-reanimated"),
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

module.exports = config;
