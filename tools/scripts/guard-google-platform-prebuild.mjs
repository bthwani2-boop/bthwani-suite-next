import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validateGoogleServicesConfigFile } from "../mobile/google-services-config.mjs";

const root = process.cwd();
const valueAfter = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const requestedProject = valueAfter("--project", "bthwani-platform");
const inputPath = path.resolve(valueAfter(
  "--input",
  "tools/scripts/google-cloud/google-platform-input.local.json",
));
const skipEas = process.argv.includes("--skip-eas");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function readJson(file) {
  const resolved = path.resolve(root, file);
  if (!fs.existsSync(resolved)) fail(`required JSON file is missing: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function run(command, args, cwd = root) {
  const executable = process.platform === "win32" && command === "pwsh" ? "pwsh.exe" : command;
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(executable, args, {
    cwd,
    stdio: "inherit",
    windowsHide: true,
    shell: false,
    env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

function validateSha1(appKey, value) {
  if (typeof value !== "string" || !/^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$/.test(value)) {
    fail(`${appKey}: invalid SHA-1 fingerprint in ${inputPath}`);
  }
  if (/^(AA:){19}AA$|^(BB:){19}BB$|^(CC:){19}CC$|^(DD:){19}DD$/.test(value)) {
    fail(`${appKey}: example SHA-1 placeholder has not been replaced`);
  }
}

function readEnvironmentValue(file, name) {
  if (!fs.existsSync(file)) return undefined;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (key.trim() === name) return rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
  return undefined;
}

const platform = readJson("tools/mobile/google-platform.manifest.json");
const mobile = readJson("tools/mobile/mobile-apps.manifest.json");
const localInput = readJson(inputPath);
const secretsMap = readJson("secrets.local.mobile.json");

if (platform.projectId !== requestedProject) {
  fail(`project mismatch: platform manifest uses '${platform.projectId}', requested '${requestedProject}'`);
}
if (localInput.projectId !== requestedProject) {
  fail(`local input projectId must be '${requestedProject}'`);
}

const firebaseApps = [...platform.firebase.androidApps];
const mapsApps = [...platform.maps.androidApps];
const expectedApps = Object.keys(mobile.apps);
for (const appKey of expectedApps) {
  if (!firebaseApps.includes(appKey)) fail(`${appKey}: missing from Firebase all-surface manifest`);
  if (!mapsApps.includes(appKey)) fail(`${appKey}: missing from Maps all-surface manifest`);

  const app = mobile.apps[appKey];
  const features = app.features ?? [];
  if (!features.includes("notifications")) fail(`${appKey}: notifications capability is required`);
  if (!features.includes("maps")) fail(`${appKey}: maps capability is required`);

  const packageJson = readJson(`apps/${appKey}/runtime/package.json`);
  if (!packageJson.dependencies?.["expo-notifications"]) fail(`${appKey}: expo-notifications dependency is required`);
  if (!packageJson.dependencies?.["expo-location"]) fail(`${appKey}: expo-location dependency is required`);
  if (!packageJson.dependencies?.["react-native-maps"]) fail(`${appKey}: react-native-maps dependency is required`);

  const input = localInput.apps?.[appKey];
  if (!input) fail(`${appKey}: missing from local Google platform input`);
  if (input.packageName !== app.androidPackage) {
    fail(`${appKey}: package mismatch in local input; expected ${app.androidPackage}`);
  }
  validateSha1(appKey, input.sha1Fingerprint);

  const firebaseFile = secretsMap[appKey];
  if (typeof firebaseFile !== "string" || !firebaseFile.trim()) {
    fail(`${appKey}: secrets.local.mobile.json does not map a Firebase file`);
  }
  const validation = validateGoogleServicesConfigFile(firebaseFile, app.androidPackage);
  if (validation.projectId !== requestedProject) {
    fail(`${appKey}: google-services.json belongs to '${validation.projectId}', expected '${requestedProject}'`);
  }
}

const configuredReferrers = localInput.controlPanel?.allowedReferrers;
if (!Array.isArray(configuredReferrers) || configuredReferrers.length === 0) {
  fail("controlPanel.allowedReferrers must contain at least one referrer");
}
const requiredReferrers = platform.maps.controlPanel.developmentReferrers ?? [];
for (const referrer of requiredReferrers) {
  if (!configuredReferrers.includes(referrer)) {
    fail(`control-panel referrer is missing from local input: ${referrer}`);
  }
}

const controlPanelEnvPath = path.resolve(root, "infra/local/control-panel.google.env");
const browserEnvName = platform.maps.controlPanel.environmentVariable;
const browserKey = process.env[browserEnvName]?.trim() || readEnvironmentValue(controlPanelEnvPath, browserEnvName);
if (!browserKey || !/^AIza[0-9A-Za-z_-]{20,}$/.test(browserKey)) {
  fail(`${browserEnvName} is missing from the process or ${controlPanelEnvPath}`);
}

if (!skipEas) {
  for (const appKey of expectedApps) {
    run("pwsh", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", path.resolve(root, "tools/scripts/repair-mobile-eas-firebase-variable.ps1"),
      "-AppKey", appKey,
      "-VerifyOnly",
    ]);
    run("pwsh", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", path.resolve(root, "tools/scripts/repair-mobile-eas-maps-variable.ps1"),
      "-AppKey", appKey,
      "-VerifyOnly",
    ]);
  }
}

console.log("\nPASS: Firebase and Google Maps prebuild readiness is proven for all four apps and the control panel.");
