// Metro configuration for Expo in pnpm monorepo (isolated linker).
// Enables resolving @bthwani/* packages from files in services/dsh/.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so files in services/dsh/ can be bundled.
config.watchFolders = [workspaceRoot];

// Resolve packages from the app's node_modules and the pnpm virtual store,
// so @bthwani/* packages are found from files outside the app root.
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules", ".pnpm", "node_modules"),
];

module.exports = config;
