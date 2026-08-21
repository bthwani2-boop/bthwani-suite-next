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
  router: ["expo-router", "expo-linking", "expo-status-bar", "react-native-screens"],
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

const GOVERNED_EXPO_INSTALL_EXCLUDES = Object.freeze(["typescript"]);
const SDK_ALIGNMENT_DEPENDENCIES = Object.freeze(["expo", "react", "react-native"]);

function expectedRuntimeDependencies(app) {
  const expected = new Set(APP_RUNTIME_INFRASTRUCTURE_DEPENDENCIES);
  for (const capability of app.nativeCapabilities ?? []) {
    const dependencies = NATIVE_CAPABILITY_DEPENDENCIES[capability];
    if (!dependencies) throw new Error(`native capability '${capability}' has no canonical dependency mapping`);
    for (const dependency of dependencies) expected.add(dependency);
  }
  return [...expected].sort();
}

function versionMajor(specifier) {
  if (typeof specifier !== "string") return null;
  const match = specifier.match(/(?:^|[^0-9])(\d+)\./);
  return match ? Number(match[1]) : null;
}

function isExpoSdkDependency(name) {
  return name === "expo" || name.startsWith("expo-");
}

function validateMobileDependencyClosure(manifest, repoRoot = path.resolve(__dirname, "../.."), options = {}) {
  const failures = [];
  const requestedAppKeys = options.appKeys ?? Object.keys(manifest.apps ?? {});
  const baselineSdkSpecifiers = new Map();

  if (!Number.isInteger(manifest.global?.expoSdk)) {
    failures.push("mobile global.expoSdk must be an integer");
  }

  for (const appKey of requestedAppKeys) {
    const app = manifest.apps?.[appKey];
    if (!app) {
      failures.push(`unknown mobile app '${appKey}'`);
      continue;
    }

    const packagePath = path.join(repoRoot, "apps", appKey, "runtime", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    let expected;
    try {
      expected = expectedRuntimeDependencies(app);
    } catch (error) {
      failures.push(`${appKey}: ${error.message}`);
      continue;
    }
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

    const installExcludes = pkg.expo?.install?.exclude ?? [];
    if (JSON.stringify(installExcludes) !== JSON.stringify(GOVERNED_EXPO_INSTALL_EXCLUDES)) {
      failures.push(`${appKey}: expo.install.exclude must contain only ${GOVERNED_EXPO_INSTALL_EXCLUDES.join(", ")}`);
    }

    const expectedSdk = manifest.global?.expoSdk;
    for (const [dependency, specifier] of Object.entries(pkg.dependencies ?? {})) {
      if (!isExpoSdkDependency(dependency)) continue;
      const major = versionMajor(specifier);
      if (major !== expectedSdk) {
        failures.push(`${appKey}: ${dependency} must belong to Expo SDK ${expectedSdk}, found ${specifier}`);
      }
    }

    for (const dependency of SDK_ALIGNMENT_DEPENDENCIES) {
      const specifier = pkg.dependencies?.[dependency];
      if (!baselineSdkSpecifiers.has(dependency)) {
        baselineSdkSpecifiers.set(dependency, { appKey, specifier });
        continue;
      }
      const baseline = baselineSdkSpecifiers.get(dependency);
      if (specifier !== baseline.specifier) {
        failures.push(`${appKey}: ${dependency} ${specifier ?? "<missing>"} does not match ${baseline.appKey} ${baseline.specifier ?? "<missing>"}`);
      }
    }
  }

  if (failures.length > 0) throw new Error(`mobile dependency closure drift\n - ${failures.join("\n - ")}`);
}

module.exports = {
  APP_RUNTIME_INFRASTRUCTURE_DEPENDENCIES,
  NATIVE_CAPABILITY_DEPENDENCIES,
  GOVERNED_EXPO_INSTALL_EXCLUDES,
  SDK_ALIGNMENT_DEPENDENCIES,
  expectedRuntimeDependencies,
  validateMobileDependencyClosure,
};
