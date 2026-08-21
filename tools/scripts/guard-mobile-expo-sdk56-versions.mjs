import "./guard-mobile-package-manager-invocation.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const appPackagePaths = [
  "apps/app-client/runtime/package.json",
  "apps/app-partner/runtime/package.json",
  "apps/app-captain/runtime/package.json",
  "apps/app-field/runtime/package.json",
];

// Exact direct-runtime versions approved for the Expo SDK 56 mobile line.
// The dependency-closure guard decides whether a package belongs to an app;
// this policy decides the only allowed version when that package is present.
const expoSdk56Policy = Object.freeze({
  expo: "~56.0.19",
  "expo-battery": "~56.0.4",
  "expo-constants": "~56.0.23",
  "expo-crypto": "~56.0.4",
  "expo-dev-client": "~56.0.24",
  "expo-document-picker": "~56.0.4",
  "expo-file-system": "~56.0.9",
  "expo-haptics": "~56.0.3",
  "expo-image": "~56.0.11",
  "expo-image-picker": "~56.0.23",
  "expo-location": "~56.0.23",
  "expo-notifications": "~56.0.23",
  "expo-secure-store": "~56.0.4",
  "expo-sharing": "~56.0.24",
  "expo-splash-screen": "~56.0.14",
  "expo-updates": "~56.0.24",
  "expo-video": "~56.1.4",
  "expo-web-browser": "~56.0.6",
  "react-native": "0.85.3",
  "react-native-maps": "1.27.2",
});

// Transitive resolution safeguards. These entries do not install a package by
// themselves; they only prevent an SDK-57 transitive from entering the SDK-56
// graph when an upstream Expo package references one of them.
const forcedPnpmPolicy = Object.freeze({
  "expo-background-task": "~56.0.23",
  "expo-constants": "~56.0.23",
  "expo-linking": "~56.0.16",
  "expo-task-manager": "~56.0.23",
});

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function dependencyValue(pkg, dependencyName) {
  for (const sectionName of dependencySections) {
    const section = pkg[sectionName];
    if (section && Object.prototype.hasOwnProperty.call(section, dependencyName)) {
      return { sectionName, value: section[dependencyName] };
    }
  }
  return undefined;
}

function checkPackage(relativePath, pkg, failures) {
  for (const [dependencyName, expectedVersion] of Object.entries(expoSdk56Policy)) {
    const current = dependencyValue(pkg, dependencyName);
    if (!current) continue;

    if (current.value !== expectedVersion) {
      failures.push(
        `${relativePath}: ${dependencyName} must be ${expectedVersion}, found ${current.value} in ${current.sectionName}`,
      );
    }
  }

  for (const sectionName of dependencySections) {
    const section = pkg[sectionName];
    if (!section) continue;

    for (const [dependencyName, version] of Object.entries(section)) {
      if (dependencyName.startsWith("expo-") && !Object.hasOwn(expoSdk56Policy, dependencyName)) {
        failures.push(`${relativePath}: ungoverned direct Expo package '${dependencyName}' (${version})`);
      }
      if (dependencyName.startsWith("expo-") && /(?:^|[~^>=< ])57\./.test(String(version))) {
        failures.push(`${relativePath}: ${dependencyName} points at Expo 57 (${version}); current mobile line is SDK 56`);
      }
    }
  }
}

function checkPnpmfile(failures) {
  const pnpmfilePath = path.join(root, ".pnpmfile.cjs");
  if (!fs.existsSync(pnpmfilePath)) {
    failures.push(".pnpmfile.cjs is required to enforce Expo SDK 56 transitive resolution policy");
    return;
  }

  const text = fs.readFileSync(pnpmfilePath, "utf8");
  for (const [dependencyName, expectedVersion] of Object.entries(forcedPnpmPolicy)) {
    if (!text.includes(`"${dependencyName}": "${expectedVersion}"`)) {
      failures.push(`.pnpmfile.cjs must force ${dependencyName} to ${expectedVersion}`);
    }
  }
}

const failures = [];

for (const relativePath of appPackagePaths) {
  checkPackage(relativePath, readJson(relativePath), failures);
}

checkPnpmfile(failures);

if (failures.length > 0) {
  console.error("FAIL: mobile Expo SDK 56 version policy drift detected");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("PASS: canonical mobile Expo packages are pinned to the approved SDK 56 policy");
