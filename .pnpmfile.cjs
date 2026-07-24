"use strict";

// Central pnpm install policy for the current mobile line.
// Keep mobile apps on Expo SDK 56 until an explicit SDK migration is approved.
// This hook prevents accidental Expo 57 pulls from root/transitive packages during pnpm install and EAS builds.

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

module.exports = {
  hooks: {
    readPackage(pkg) {
      return applyForcedExpoSdk56Versions(pkg);
    },
  },
};
