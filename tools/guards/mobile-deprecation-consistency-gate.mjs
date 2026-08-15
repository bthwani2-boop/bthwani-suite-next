import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "mobile-deprecation-consistency-gate";
const violations = [];
const requestedAppIndex = process.argv.indexOf("--app");
const requestedApp = requestedAppIndex >= 0 ? process.argv[requestedAppIndex + 1] : null;

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"));
const capabilityDependencies = {
  router: "expo-router",
  updates: "expo-updates",
  constants: "expo-constants",
  application: "expo-application",
  device: "expo-device",
  crypto: "expo-crypto",
  image: "expo-image",
  battery: "expo-battery",
  splashScreen: "expo-splash-screen",
  localization: "expo-localization",
  localAuthentication: "expo-local-authentication",
  fileSystem: "expo-file-system",
  documentPicker: "expo-document-picker",
  imagePicker: "expo-image-picker",
  audio: "expo-audio",
  camera: "expo-camera",
  video: "expo-video",
  imageManipulator: "expo-image-manipulator",
  sharing: "expo-sharing",
  webBrowser: "expo-web-browser",
  keepAwake: "expo-keep-awake",
  sqlite: "expo-sqlite",
  taskManager: "expo-task-manager",
  backgroundTask: "expo-background-task",
  location: "expo-location",
  backgroundLocation: "expo-location",
  maps: "react-native-maps",
  notifications: "expo-notifications",
  secureStore: "expo-secure-store",
};

const targetApps = requestedApp ? [requestedApp] : Object.keys(manifest.apps ?? {});
for (const appKey of targetApps) {
  const app = manifest.apps?.[appKey];
  if (!app) {
    violations.push({ file: "tools/mobile/mobile-apps.manifest.json", message: `unknown governed app '${appKey}'` });
    continue;
  }

  const packagePath = `apps/${appKey}/runtime/package.json`;
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, packagePath), "utf8"));
  const deprecated = pkg["x-bthwani-deprecations"]?.nativeDependencies ?? {};
  const activeDependencies = new Map();

  for (const capability of app.nativeCapabilities ?? []) {
    const dependency = capabilityDependencies[capability];
    if (dependency) activeDependencies.set(dependency, capability);
  }

  for (const [dependency, capability] of activeDependencies) {
    if (deprecated[dependency]) {
      violations.push({
        file: packagePath,
        message: `FORBIDDEN: '${dependency}' is marked deprecated while native capability '${capability}' is active`,
      });
    }
  }

  if (manifest.global?.navigationArchitecture?.appliesTo?.includes(appKey) && deprecated["expo-router"]) {
    violations.push({
      file: packagePath,
      message: "FORBIDDEN: expo-router is the adopted target navigation architecture and cannot be a deprecation candidate",
    });
  }
}

fail(guardId, violations);
