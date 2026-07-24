import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requireBuildSecrets = process.argv.includes("--require-build-secrets");
const platformArgIndex = process.argv.indexOf("--platform");
const platform = platformArgIndex >= 0 ? process.argv[platformArgIndex + 1] : "android";
const profileArgIndex = process.argv.indexOf("--profile");
const profile = profileArgIndex >= 0 ? process.argv[profileArgIndex + 1] : "development";

if (!["android", "ios", "all"].includes(platform)) {
  console.error("FAIL: --platform must be android, ios, or all");
  process.exit(1);
}
if (!["development", "internal", "production"].includes(profile)) {
  console.error("FAIL: --profile must be development, internal, or production");
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function fail(message) {
  console.error("FAIL:", message);
  process.exit(1);
}

function requireFile(file, label = file) {
  if (!fs.existsSync(path.resolve(root, file))) fail(`${label} is required`);
}

function resolveInvocation(command, args) {
  if (command !== "pnpm") return { executable: command, args };
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) fail("npm_execpath is unavailable. Run this guard through a pnpm script.");
  return { executable: process.execPath, args: [pnpmCli, ...args] };
}

function run(command, args, cwd) {
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd,
    shell: false,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" },
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    fail(`${command} ${args.join(" ")} failed`);
  }
  return result.stdout ?? "";
}

function pluginMap(plugins) {
  return new Map((plugins ?? []).map((plugin) => {
    const tuple = Array.isArray(plugin) ? plugin : [plugin, undefined];
    return [tuple[0], tuple[1]];
  }));
}

function requireEnv(name, key) {
  const value = process.env[key]?.trim();
  if (!value) fail(`${name}: ${key} is required for ${profile}/${platform} build preflight`);
  return value;
}

function validateGoogleServicesFile(appKey, file, expectedPackage) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) {
    fail(`${appKey}: GOOGLE_SERVICES_JSON does not point to an existing file: ${absolute}`);
  }

  let googleServices;
  try {
    googleServices = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    fail(`${appKey}: GOOGLE_SERVICES_JSON is not valid JSON: ${error.message}`);
  }

  const packageNames = (googleServices.client ?? [])
    .map((client) => client?.client_info?.android_client_info?.package_name)
    .filter((value) => typeof value === "string" && value.length > 0);

  if (!packageNames.includes(expectedPackage)) {
    const actual = packageNames.length > 0 ? packageNames.join(", ") : "none";
    fail(`${appKey}: GOOGLE_SERVICES_JSON must contain Android package '${expectedPackage}' (found: ${actual})`);
  }
}

const manifest = readJson("tools/mobile/mobile-apps.manifest.json");
const rootPkg = readJson("package.json");

if (rootPkg.packageManager !== `pnpm@${manifest.global.pnpm}`) {
  fail(`root packageManager must be pnpm@${manifest.global.pnpm}`);
}
if (rootPkg.engines?.node !== `>=${manifest.global.node} <25`) fail("root node engine mismatch");
if (rootPkg.engines?.pnpm !== manifest.global.pnpm) fail(`root pnpm engine must be ${manifest.global.pnpm}`);
if (rootPkg.pnpm) fail("root package.json must not contain pnpm config; use pnpm-workspace.yaml");
if (!/^\d+\.\d+\.\d+$/.test(manifest.global.version) || manifest.global.version === "0.1.0") {
  fail("mobile release version must be an intentional semver newer than the bootstrap 0.1.0");
}

const expectedChannels = {
  development: "development",
  internal: "preview",
  production: "production",
};
const requiredAssets = ["icon.png", "adaptive-icon.png", "splash-icon.png", "notification-icon.png"];

for (const [key, app] of Object.entries(manifest.apps)) {
  const dir = path.join(root, "apps", key, "runtime");
  const pkg = readJson(path.join("apps", key, "runtime", "package.json"));
  const eas = readJson(path.join("apps", key, "runtime", "eas.json"));
  const features = app.features ?? [];

  if (pkg.devDependencies?.typescript !== "~6.0.3") fail(`${key}: TypeScript must be ~6.0.3`);
  if (pkg.scripts?.typecheck !== "tsc --noEmit -p tsconfig.json") fail(`${key}: strict typecheck script is required`);
  if (!pkg.dependencies?.["@sentry/react-native"]) fail(`${key}: @sentry/react-native is required`);
  if (!pkg.dependencies?.["@bthwani/data-runtime"]) fail(`${key}: @bthwani/data-runtime is required`);
  if (!pkg.dependencies?.["@bthwani/media-runtime"]) fail(`${key}: @bthwani/media-runtime is required`);
  for (const asset of requiredAssets) requireFile(path.join("apps", key, "runtime", "assets", asset), `${key}: ${asset}`);

  if (eas.cli?.appVersionSource !== "remote") fail(`${key}: EAS appVersionSource must be remote`);
  if (eas.cli?.requireCommit !== true) fail(`${key}: EAS builds must require an immutable commit`);
  if (eas.cli?.promptToConfigurePushNotifications !== false) fail(`${key}: push credential prompts must be disabled`);
  if (eas.build?.base?.node !== manifest.global.node) fail(`${key}: EAS node must be ${manifest.global.node}`);
  if (eas.build?.base?.pnpm !== manifest.global.pnpm) fail(`${key}: EAS pnpm must be ${manifest.global.pnpm}`);
  if (Object.hasOwn(eas.build?.base?.env ?? {}, "EAS_SKIP_AUTO_FINGERPRINT")) fail(`${key}: EAS_SKIP_AUTO_FINGERPRINT is forbidden`);
  if (eas.build?.development?.environment !== "development") fail(`${key}: development environment mismatch`);
  if (eas.build?.internal?.environment !== "preview") fail(`${key}: internal environment mismatch`);
  if (eas.build?.production?.environment !== "production") fail(`${key}: production environment mismatch`);
  for (const [profileName, channel] of Object.entries(expectedChannels)) {
    if (eas.build?.[profileName]?.channel !== channel) fail(`${key}: ${profileName} channel must be ${channel}`);
  }
  if (eas.build?.development?.developmentClient !== true) fail(`${key}: developmentClient must be true`);
  if (eas.build?.development?.distribution !== "internal") fail(`${key}: development distribution must be internal`);
  if (eas.build?.development?.android?.buildType !== "apk") fail(`${key}: development Android build must be apk`);
  if (eas.build?.internal?.android?.buildType !== "apk") fail(`${key}: internal Android build must be apk`);
  if (eas.build?.production?.android?.buildType !== "app-bundle") fail(`${key}: production Android build must be app-bundle`);
  if (eas.build?.production?.autoIncrement !== true) fail(`${key}: production autoIncrement must be true`);

  const raw = run("pnpm", ["--dir", dir, "exec", "expo", "config", "--json"], root);
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) fail(`${key}: expo config did not return JSON`);
  const expo = JSON.parse(raw.slice(jsonStart));

  if (expo.name !== app.name) fail(`${key}: name mismatch`);
  if (expo.slug !== app.slug) fail(`${key}: slug mismatch`);
  if (expo.owner !== manifest.global.owner) fail(`${key}: owner mismatch`);
  if (expo.scheme !== app.scheme) fail(`${key}: scheme mismatch`);
  if (expo.version !== manifest.global.version) fail(`${key}: version mismatch`);
  if (expo.entryPoint !== "./index.js") fail(`${key}: entryPoint mismatch`);
  if (expo.android?.package !== app.androidPackage) fail(`${key}: Android package mismatch`);
  if (expo.ios?.bundleIdentifier !== app.iosBundleIdentifier) fail(`${key}: iOS bundleIdentifier mismatch`);
  if (expo.extra?.appKey !== key) fail(`${key}: extra.appKey mismatch`);
  if (expo.extra?.appLine !== manifest.global.appLine) fail(`${key}: extra.appLine mismatch`);
  if (expo.extra?.sourceRepo !== manifest.global.sourceRepo) fail(`${key}: extra.sourceRepo mismatch`);
  if (expo.extra?.eas?.projectId !== app.projectId) fail(`${key}: EAS projectId mismatch`);
  if (expo.runtimeVersion?.policy !== "fingerprint") fail(`${key}: fingerprint runtime policy is required`);
  if (expo.updates?.url !== `https://u.expo.dev/${app.projectId}`) fail(`${key}: EAS Update URL mismatch`);
  if (expo.updates?.checkAutomatically !== "ON_LOAD") fail(`${key}: update check policy mismatch`);
  if (expo.updates?.fallbackToCacheTimeout !== 0) fail(`${key}: update fallback timeout must be zero`);
  if (Array.isArray(expo.platforms) && expo.platforms.includes("web")) fail(`${key}: web is forbidden in Expo mobile config`);

  const plugins = pluginMap(expo.plugins);
  for (const basePlugin of ["expo-image-picker", "expo-document-picker"]) {
    if (!plugins.has(basePlugin)) fail(`${key}: missing ${basePlugin} plugin`);
  }
  const sentryNativeConfigured = expo.extra?.sentry?.nativeConfigured === true;
  const sentryEnabled = expo.extra?.sentry?.enabled === true;
  const hasSentryPlugin = plugins.has("@sentry/react-native/expo");
  if (sentryEnabled !== sentryNativeConfigured) fail(`${key}: Sentry enabled/nativeConfigured state mismatch`);
  if (hasSentryPlugin !== sentryNativeConfigured) fail(`${key}: Sentry Expo plugin must match native configuration state`);

  const featurePlugins = {
    router: "expo-router",
    updates: "expo-updates",
    splashScreen: "expo-splash-screen",
    localAuthentication: "expo-local-authentication",
    audio: "expo-audio",
    camera: "expo-camera",
    video: "expo-video",
    sharing: "expo-sharing",
    webBrowser: "expo-web-browser",
    sqlite: "expo-sqlite",
    taskManager: "expo-task-manager",
    backgroundTask: "expo-background-task",
    location: "expo-location",
    backgroundLocation: "expo-location",
    notifications: "expo-notifications",
    secureStore: "expo-secure-store",
  };
  for (const [feature, plugin] of Object.entries(featurePlugins)) {
    if (features.includes(feature) && !plugins.has(plugin)) fail(`${key}: feature '${feature}' requires plugin '${plugin}'`);
  }

  const featureDependencies = {
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
  for (const [feature, dependency] of Object.entries(featureDependencies)) {
    if (features.includes(feature) && !pkg.dependencies?.[dependency]) fail(`${key}: feature '${feature}' requires dependency '${dependency}'`);
  }

  const needsMicrophone = features.includes("audio") || (features.includes("camera") && features.includes("video"));
  const hasMicDescription = Boolean(expo.ios?.infoPlist?.NSMicrophoneUsageDescription);
  const blockedAudio = (expo.android?.blockedPermissions ?? []).includes("android.permission.RECORD_AUDIO");
  if (needsMicrophone !== hasMicDescription) fail(`${key}: microphone permission description does not match native capabilities`);
  if (needsMicrophone && blockedAudio) fail(`${key}: RECORD_AUDIO cannot be blocked when recording is enabled`);
  if (!needsMicrophone && !blockedAudio) fail(`${key}: RECORD_AUDIO must be blocked when recording is absent`);

  if (features.includes("notifications")) {
    const notificationOptions = plugins.get("expo-notifications");
    if (notificationOptions?.defaultChannel !== "bthwani-operational") fail(`${key}: notification default channel mismatch`);
  }

  const metro = fs.readFileSync(path.join(dir, "metro.config.cjs"), "utf8");
  for (const marker of ["getSentryExpoConfig", "shared/media-runtime", "@bthwani/media-runtime"]) {
    if (!metro.includes(marker)) fail(`${key}: Metro marker missing: ${marker}`);
  }
  const appRoot = fs.readFileSync(path.join(dir, "src", "index.ts"), "utf8");
  for (const marker of ["persistenceKey", "createBthwaniOfflineMutationQueue", "clearBthwaniQueryClient", "registerIdentityBeforeSessionEndHook"]) {
    if (!appRoot.includes(marker)) fail(`${key}: tenant-safe data runtime marker missing: ${marker}`);
  }
  if ((key === "app-captain" || key === "app-field") && !appRoot.includes("wireBatteryAwareQueue")) {
    fail(`${key}: battery-aware offline synchronization is required`);
  }
  const sentryRuntime = fs.readFileSync(path.join(dir, "src", "observability", "sentry.ts"), "utf8");
  for (const marker of ["sendDefaultPii: false", "beforeSend", "SENTRY_TRACES_SAMPLE_RATE", "FORBIDDEN_KEY"]) {
    if (!sentryRuntime.includes(marker)) fail(`${key}: Sentry SaaS privacy marker missing: ${marker}`);
  }

  if (requireBuildSecrets) {
    if ((platform === "android" || platform === "all") && features.includes("notifications")) {
      const googleServices = requireEnv(key, "GOOGLE_SERVICES_JSON");
      validateGoogleServicesFile(key, googleServices, app.androidPackage);
    }
    if (features.includes("maps") && profile !== "development") {
      if (platform === "android" || platform === "all") requireEnv(key, "GOOGLE_MAPS_ANDROID_API_KEY");
      if (platform === "ios" || platform === "all") requireEnv(key, "GOOGLE_MAPS_IOS_API_KEY");
    }
    if (profile !== "development") {
      for (const envName of ["EXPO_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT", "EXPO_PUBLIC_APP_ENV"]) {
        requireEnv(key, envName);
      }
    }
  }
}

const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
if (!workspace.includes("apps/*/runtime")) fail("pnpm-workspace.yaml must include apps/*/runtime");
if (!workspace.includes("shared/media-runtime")) fail("pnpm-workspace.yaml must include shared/media-runtime");
if (!workspace.includes("allowBuilds:")) fail("pnpm-workspace.yaml must define allowBuilds");
if (!workspace.includes('"@sentry/cli": true')) fail("pnpm-workspace.yaml must allow the Sentry CLI source-map uploader");
if (workspace.includes("onlyBuiltDependencies")) fail("pnpm-workspace.yaml must not use onlyBuiltDependencies");
if (workspace.includes("ignoredBuiltDependencies")) fail("pnpm-workspace.yaml must not use ignoredBuiltDependencies");

for (const file of [
  "shared/data-runtime/src/persistence.ts",
  "shared/data-runtime/src/offline-mutation-queue.ts",
  "shared/media-runtime/src/resumable-upload.ts",
  "shared/media-runtime/src/CachedMediaImage.tsx",
]) requireFile(file);

console.log(`PASS: mobile Expo/EAS configuration is centrally guarded for ${profile}/${platform}`);
