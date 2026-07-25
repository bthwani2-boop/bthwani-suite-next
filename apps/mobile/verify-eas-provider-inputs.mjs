import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGoogleServicesConfigFile } from "../../tools/mobile/google-services-config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const appIndex = process.argv.indexOf("--app");
const appKey = appIndex >= 0 ? process.argv[appIndex + 1] : undefined;
const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);
const app = appKey ? manifest.apps?.[appKey] : undefined;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "android") {
  console.log("PASS: Android provider verification is not required for this platform.");
  process.exit(0);
}
if (!app) fail(`Unknown or missing mobile app key: ${appKey ?? "none"}`);
if (process.env.EAS_BUILD_PROJECT_ID && process.env.EAS_BUILD_PROJECT_ID !== app.projectId) {
  fail(`${appKey}: EAS_BUILD_PROJECT_ID does not match the governed project ID.`);
}

const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();
if (!googleServicesFile) fail(`${appKey}: GOOGLE_SERVICES_JSON file variable is missing on EAS.`);
if (!fs.existsSync(googleServicesFile) || !fs.statSync(googleServicesFile).isFile()) {
  fail(`${appKey}: GOOGLE_SERVICES_JSON does not resolve to a file on EAS.`);
}

let validation;
try {
  validation = validateGoogleServicesConfigFile(googleServicesFile, app.androidPackage);
} catch (error) {
  fail(`${appKey}: GOOGLE_SERVICES_JSON validation failed: ${error.message}`);
}
if (validation.projectId !== "bthwani-platform") {
  fail(`${appKey}: Firebase project must be bthwani-platform.`);
}

const config = JSON.parse(fs.readFileSync(googleServicesFile, "utf8"));
const client = config.client.find(
  (entry) => entry?.client_info?.android_client_info?.package_name === app.androidPackage,
);
const firebaseKey = client?.api_key?.[0]?.current_key?.trim();
const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
const keyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
if (!keyPattern.test(firebaseKey ?? "")) fail(`${appKey}: Firebase API key is missing or invalid on EAS.`);
if (!keyPattern.test(mapsKey ?? "")) fail(`${appKey}: Maps API key is missing or invalid on EAS.`);
if (firebaseKey === mapsKey) fail(`${appKey}: Firebase and Maps API keys must be separate.`);

console.log(`PASS: ${appKey} EAS Firebase and Maps provider inputs are valid.`);
