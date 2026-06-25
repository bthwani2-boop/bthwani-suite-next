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
