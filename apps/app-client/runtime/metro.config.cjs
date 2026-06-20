// Metro configuration for Expo in pnpm monorepo (isolated linker).
// Enables resolving @bthwani/* packages from files in services/dsh/.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so files in services/dsh/ can be bundled.
config.watchFolders = [workspaceRoot];

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
};

module.exports = config;
