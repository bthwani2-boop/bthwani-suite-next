"use strict";

const EXPO_SDK_56_FORCED = Object.freeze({
  "expo-background-task": "~56.0.23",
  "expo-constants": "~56.0.22",
  "expo-linking": "~56.0.16",
  "expo-task-manager": "~56.0.23",
});

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

function applyForcedExpoSdk56Versions(pkg) {
  for (const sectionName of DEPENDENCY_SECTIONS) {
    const section = pkg[sectionName];
    if (!section || typeof section !== "object") continue;

    for (const [dependencyName, forcedVersion] of Object.entries(EXPO_SDK_56_FORCED)) {
      if (Object.prototype.hasOwnProperty.call(section, dependencyName)) {
        section[dependencyName] = forcedVersion;
      }
    }
  }
  return pkg;
}

function applyCompilerApiBridge(pkg) {
  if (pkg.name !== "openapi-typescript") return pkg;

  if (pkg.peerDependencies) delete pkg.peerDependencies.typescript;
  if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript;
  pkg.dependencies = {
    ...pkg.dependencies,
    typescript: "npm:@typescript/typescript6@6.0.2",
  };
  return pkg;
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      return applyCompilerApiBridge(applyForcedExpoSdk56Versions(pkg));
    },
  },
};
