module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'openapi-typescript') {
        if (pkg.peerDependencies) {
          delete pkg.peerDependencies.typescript;
        }
        if (pkg.peerDependenciesMeta) {
          delete pkg.peerDependenciesMeta.typescript;
        }
        pkg.dependencies = {
          ...pkg.dependencies,
          typescript: '6.0.3'
        };
      }
      return pkg;
    }
  }
};
