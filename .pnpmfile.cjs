"use strict";

function applyCompilerApiBridge(pkg) {
  if (pkg.name !== "openapi-typescript") return pkg;

  if (pkg.peerDependencies) {
    delete pkg.peerDependencies.typescript;
  }

  if (pkg.peerDependenciesMeta) {
    delete pkg.peerDependenciesMeta.typescript;
  }

  pkg.dependencies = {
    ...pkg.dependencies,
    typescript: "npm:@typescript/typescript6@6.0.2",
  };

  return pkg;
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      return applyCompilerApiBridge(pkg);
    },
  },
};
