import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pnpmVersion = "10.34.2";
const nodeVersion = "24.17.0";

const apps = [
  ["app-client", "apps/app-client/runtime", "app-client-next", "com.bthwani.client.next"],
  ["app-partner", "apps/app-partner/runtime", "app-partner-next", "com.bthwani.partner.next"],
  ["app-captain", "apps/app-captain/runtime", "app-captain-next", "com.bthwani.captain.next"],
  ["app-field", "apps/app-field/runtime", "app-field-next", "com.bthwani.field.next"]
];

const requiredDeps = {
  "expo": "~56.0.12",
  "expo-dev-client": "~56.0.20",
  "react": "19.2.3",
  "react-native": "0.85.3",
  "react-native-gesture-handler": "~2.31.2",
  "react-native-reanimated": "4.3.1",
  "react-native-safe-area-context": "~5.7.0",
  "react-native-screens": "4.25.2",
  "react-native-svg": "15.15.4",
  "react-native-worklets": "0.8.3"
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

const rootPkg = readJson("package.json");

if (rootPkg.packageManager !== "pnpm@" + pnpmVersion) {
  fail("root packageManager must be pnpm@" + pnpmVersion);
}

if (rootPkg.engines?.node !== ">=24.17.0 <25") {
  fail("root node engine mismatch");
}

if (rootPkg.engines?.pnpm !== pnpmVersion) {
  fail("root pnpm engine must be " + pnpmVersion);
}

if (rootPkg.pnpm) {
  fail("root package.json must not contain pnpm config");
}

for (const app of apps) {
  const key = app[0];
  const dir = app[1];
  const slug = app[2];
  const androidPackage = app[3];

  const pkg = readJson(path.join(dir, "package.json"));

  if (pkg.devDependencies?.typescript !== "~6.0.3") {
    fail(key + ": TypeScript must be ~6.0.3");
  }

  for (const dep of Object.keys(requiredDeps)) {
    const expected = requiredDeps[dep];
    const actual = pkg.dependencies?.[dep];

    if (actual !== expected) {
      fail(key + ": " + dep + " expected " + expected + ", found " + actual);
    }
  }

  const eas = readJson(path.join(dir, "eas.json"));

  if (eas.build?.base?.node !== nodeVersion) {
    fail(key + ": EAS node must be " + nodeVersion);
  }

  if (eas.build?.base?.corepack !== true) {
    fail(key + ": EAS corepack must be true");
  }

  if (eas.build?.base?.pnpm !== pnpmVersion) {
    fail(key + ": EAS pnpm must be " + pnpmVersion);
  }

  if (eas.build?.development?.developmentClient !== true) {
    fail(key + ": developmentClient must be true");
  }

  if (eas.build?.development?.distribution !== "internal") {
    fail(key + ": development distribution must be internal");
  }

  if (eas.build?.development?.android?.buildType !== "apk") {
    fail(key + ": development android.buildType must be apk");
  }

  const config = fs.readFileSync(path.join(root, dir, "app.config.ts"), "utf8");

  if (!config.includes('slug: "' + slug + '"')) {
    fail(key + ": slug mismatch in app.config.ts");
  }

  if (!config.includes('package: "' + androidPackage + '"')) {
    fail(key + ": Android package mismatch in app.config.ts");
  }

  if (config.includes('"web"') || config.includes("'web'")) {
    fail(key + ": web is forbidden in Expo mobile config");
  }
}

const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");

if (!workspace.includes("allowBuilds:")) {
  fail("pnpm-workspace.yaml must define allowBuilds");
}

if (workspace.includes("onlyBuiltDependencies")) {
  fail("pnpm-workspace.yaml must not use onlyBuiltDependencies");
}

if (workspace.includes("ignoredBuiltDependencies")) {
  fail("pnpm-workspace.yaml must not use ignoredBuiltDependencies");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("PASS: mobile Expo baseline uses EAS-compatible pnpm " + pnpmVersion);
