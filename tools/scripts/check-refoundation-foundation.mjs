import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const policyRelative =
  "governance/refoundation/foundation-protection.policy.json";
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return null;
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

const policy = readJson(policyRelative);

if (policy) {
  for (const requiredFile of policy.requiredFiles ?? []) {
    readText(requiredFile);
  }
}

const packageJson = readJson("package.json");
if (policy && packageJson) {
  const expected = policy.lockedToolchain ?? {};
  if (packageJson.packageManager !== expected.packageManager) {
    fail(
      `packageManager drift: expected ${expected.packageManager}, received ${packageJson.packageManager}`,
    );
  }
  if (packageJson.engines?.node !== expected.nodeEngine) {
    fail(
      `Node engine drift: expected ${expected.nodeEngine}, received ${packageJson.engines?.node}`,
    );
  }
  if (packageJson.engines?.pnpm !== expected.pnpm) {
    fail(
      `pnpm engine drift: expected ${expected.pnpm}, received ${packageJson.engines?.pnpm}`,
    );
  }
}

const mobileManifest = readJson("tools/mobile/mobile-apps.manifest.json");
if (policy && mobileManifest) {
  for (const appKey of policy.requiredMobileApps ?? []) {
    const app = mobileManifest.apps?.[appKey];
    if (!app) {
      fail(`Mobile manifest is missing required app: ${appKey}`);
      continue;
    }

    for (const field of [
      "name",
      "slug",
      "scheme",
      "androidPackage",
      "iosBundleIdentifier",
      "projectId",
    ]) {
      if (typeof app[field] !== "string" || app[field].trim() === "") {
        fail(`Mobile manifest ${appKey}.${field} must be a non-empty string`);
      }
    }

    if (!Array.isArray(app.features) || app.features.length === 0) {
      fail(`Mobile manifest ${appKey}.features must be a non-empty array`);
    }

    const appConfigPath = `apps/${appKey}/runtime/app.config.ts`;
    const appConfig = readText(appConfigPath);
    if (appConfig && !appConfig.includes(`defineBthwaniExpoApp("${appKey}")`)) {
      fail(`${appConfigPath} must use the central Expo application definition`);
    }

    const easPath = `apps/${appKey}/runtime/eas.json`;
    const eas = readJson(easPath);
    if (!eas) continue;

    for (const profile of ["development", "internal", "production"]) {
      if (!eas.build?.[profile]) {
        fail(`${easPath} is missing EAS build profile: ${profile}`);
      }
    }

    if (eas.build?.development?.developmentClient !== true) {
      fail(`${easPath} development profile must build a development client`);
    }
    if (eas.build?.production?.android?.buildType !== "app-bundle") {
      fail(`${easPath} production Android build must remain app-bundle`);
    }
  }
}

const compose = readText("infra/docker/compose.runtime.yml");
if (compose) {
  for (const requiredToken of [
    "postgres:",
    "minio:",
    "127.0.0.1:",
    "healthcheck:",
  ]) {
    if (!compose.includes(requiredToken)) {
      fail(`Docker runtime foundation is missing token: ${requiredToken}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Refoundation foundation check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Refoundation foundation check passed: ${policy.requiredFiles.length} files and ${policy.requiredMobileApps.length} mobile apps verified.`,
);
