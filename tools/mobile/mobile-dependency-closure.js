const fs = require("fs");
const path = require("path");

const APP_RUNTIME_INFRASTRUCTURE_DEPENDENCIES = Object.freeze([
  "@bthwani/core-identity",
  "@bthwani/data-runtime",
  "@bthwani/dsh",
  "@bthwani/ui-kit",
  "@expo/vector-icons",
  "@react-native-community/netinfo",
  "@sentry/react-native",
  "expo",
  "expo-dev-client",
  "react",
  "react-native",
  "react-native-safe-area-context",
]);

const NATIVE_CAPABILITY_DEPENDENCIES = Object.freeze({
  router: ["expo-router"],
  updates: ["expo-updates"],
  constants: ["expo-constants"],
  application: ["expo-application"],
  device: ["expo-device"],
  crypto: ["expo-crypto"],
  image: ["expo-image"],
  battery: ["expo-battery"],
  splashScreen: ["expo-splash-screen"],
  localization: ["expo-localization"],
  localAuthentication: ["expo-local-authentication"],
  fileSystem: ["expo-file-system"],
  documentPicker: ["expo-document-picker"],
  imagePicker: ["expo-image-picker"],
  secureStore: ["expo-secure-store"],
  notifications: ["expo-notifications"],
  audio: ["expo-audio"],
  camera: ["expo-camera"],
  video: ["expo-video"],
  imageManipulator: ["expo-image-manipulator"],
  sharing: ["expo-sharing"],
  webBrowser: ["expo-web-browser"],
  haptics: ["expo-haptics"],
  keepAwake: ["expo-keep-awake"],
  sqlite: ["expo-sqlite"],
  location: ["expo-location"],
  backgroundLocation: ["expo-location", "expo-task-manager"],
  maps: ["react-native-maps"],
  taskManager: ["expo-task-manager"],
  backgroundTask: ["expo-background-task"],
});

function expectedRuntimeDependencies(app) {
  const expected = new Set(APP_RUNTIME_INFRASTRUCTURE_DEPENDENCIES);
  for (const capability of app.nativeCapabilities ?? []) {
    for (const dependency of NATIVE_CAPABILITY_DEPENDENCIES[capability] ?? []) {
      expected.add(dependency);
    }
  }
  return [...expected].sort();
}

function validateMobileDependencyClosure(manifest, repoRoot = path.resolve(__dirname, "../..")) {
  const failures = [];
  for (const [appKey, app] of Object.entries(manifest.apps ?? {})) {
    const packagePath = path.join(repoRoot, "apps", appKey, "runtime", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const expected = expectedRuntimeDependencies(app);
    const actual = Object.keys(pkg.dependencies ?? {}).sort();
    const missing = expected.filter((dependency) => !actual.includes(dependency));
    const extra = actual.filter((dependency) => !expected.includes(dependency));

    if (missing.length > 0) failures.push(`${appKey}: missing canonical dependencies: ${missing.join(", ")}`);
    if (extra.length > 0) failures.push(`${appKey}: undeclared or wrongly-owned dependencies: ${extra.join(", ")}`);
    if (pkg.main !== "index.js") failures.push(`${appKey}: package main must be canonical index.js, found ${pkg.main ?? "<missing>"}`);

    const expectedDevDependencies = { typescript: manifest.global.runtimeTypeScript };
    if (JSON.stringify(pkg.devDependencies ?? {}) !== JSON.stringify(expectedDevDependencies)) {
      failures.push(`${appKey}: devDependencies must contain only the governed runtime TypeScript alias`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`mobile dependency closure drift\n - ${failures.join("\n - ")}`);
  }
}

module.exports = {
  APP_RUNTIME_INFRASTRUCTURE_DEPENDENCIES,
  NATIVE_CAPABILITY_DEPENDENCIES,
  expectedRuntimeDependencies,
  validateMobileDependencyClosure,
};
