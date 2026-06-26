// Metro configuration for Expo in pnpm monorepo (isolated linker).
// Enables resolving @bthwani/* packages from files in services/dsh/.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../../..");

const config = getDefaultConfig(projectRoot);

// Watch specific source directories in the monorepo instead of the whole workspace root
// to prevent the watcher from failing on Windows due to massive/nested directories (e.g., node_modules, .next).
config.watchFolders = [
  projectRoot,
  path.join(workspaceRoot, "services/dsh"),
  path.join(workspaceRoot, "shared/ui-kit"),
  path.join(workspaceRoot, "shared/app-shell"),
  path.join(workspaceRoot, "core/identity"),
];

// Resolve packages from the app's node_modules, then workspace root.
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
];

// pnpm isolated linker places @bthwani/* as POSIX symlinks in .pnpm/node_modules.
// Metro on Windows cannot follow those symlinks reliably, so map each package
// directly to its source directory. Metro then uses the package's "main" field.
config.resolver.extraNodeModules = {
  "@bthwani/ui-kit": path.join(workspaceRoot, "shared/ui-kit"),
  "@bthwani/core-identity": path.join(workspaceRoot, "core/identity"),
  // Force resolution of shared packages to local node_modules to prevent duplicate bundle registration issues
  "react": path.join(projectRoot, "node_modules/react"),
  "react-native": path.join(projectRoot, "node_modules/react-native"),
  "react-native-safe-area-context": path.join(projectRoot, "node_modules/react-native-safe-area-context"),
  "react-native-svg": path.join(projectRoot, "node_modules/react-native-svg"),
  "react-native-screens": path.join(projectRoot, "node_modules/react-native-screens"),
  "react-native-gesture-handler": path.join(projectRoot, "node_modules/react-native-gesture-handler"),
  "react-native-reanimated": path.join(projectRoot, "node_modules/react-native-reanimated"),
};

// TypeScript ESM packages (moduleResolution: nodenext) use explicit .js extensions
// in their source imports. Metro cannot resolve ./foo.js when the actual file is
// ./foo.ts. Strip the .js extension so Metro can find the TypeScript source file.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith(".js") && !moduleName.startsWith("http")) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // Fall through to default resolution with original module name
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
