import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check");

if (!apply && !check) {
  console.error("FAIL: use --apply or --check");
  process.exit(1);
}

function abs(file) {
  return path.join(root, file);
}

function readText(file) {
  return fs.existsSync(abs(file)) ? fs.readFileSync(abs(file), "utf8") : "";
}

function writeText(file, content) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(
    abs(file),
    content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n",
    "utf8"
  );
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function writeJson(file, value) {
  writeText(file, JSON.stringify(value, null, 2));
}

function sameText(a, b) {
  return a.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n" ===
    b.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n";
}

function assertSame(file, expected) {
  if (!sameText(readText(file), expected)) {
    throw new Error(`${file}: not synchronized`);
  }
}

function isUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

const manifest = readJson("tools/mobile/mobile-apps.manifest.json");
const easTemplate = readJson("tools/mobile/eas.template.json");
const appKeys = Object.keys(manifest.apps);

for (const key of appKeys) {
  const app = manifest.apps[key];

  for (const field of ["name", "slug", "scheme", "androidPackage", "iosBundleIdentifier", "projectId"]) {
    if (!app[field]) throw new Error(`${key}: missing ${field}`);
  }

  if (!isUuid(app.projectId)) {
    throw new Error(`${key}: invalid projectId`);
  }
}

function appDir(key) {
  return `apps/${key}/runtime`;
}

function appConfig(key) {
  return `import { defineBthwaniExpoApp } from "../../../tools/mobile/defineBthwaniExpoApp";

export default defineBthwaniExpoApp("${key}");
`;
}

function factoryJsContent() {
  return `const manifest = require("./mobile-apps.manifest.json");

function defineBthwaniExpoApp(appKey) {
  const app = manifest.apps[appKey];

  if (!app) {
    throw new Error("Unknown BThwani mobile app: " + appKey);
  }

  return {
    name: app.name,
    slug: app.slug,
    owner: manifest.global.owner,

    platforms: ["ios", "android"],

    scheme: app.scheme,
    version: manifest.global.version,

    orientation: "portrait",
    userInterfaceStyle: "light",

    android: {
      package: app.androidPackage
    },

    ios: {
      bundleIdentifier: app.iosBundleIdentifier
    },

    extra: {
      appKey,
      appLine: manifest.global.appLine,
      sourceRepo: manifest.global.sourceRepo,
      eas: {
        projectId: app.projectId
      }
    }
  };
}

module.exports = {
  defineBthwaniExpoApp
};
`;
}

function factoryDtsContent() {
  const union = appKeys.map((key) => `"${key}"`).join(" | ");

  return `import type { ExpoConfig } from "expo/config";

export type BthwaniMobileAppKey = ${union};

export declare function defineBthwaniExpoApp(appKey: BthwaniMobileAppKey): ExpoConfig;
`;
}

function updateRootScripts() {
  const pkg = readJson("package.json");
  pkg.scripts = pkg.scripts ?? {};

  pkg.scripts["mobile:apps:sync"] = "node tools/scripts/sync-mobile-apps.mjs --apply";
  pkg.scripts["mobile:expo:verify"] = "node tools/scripts/guard-mobile-apps.mjs";
  pkg.scripts["mobile:eas:preflight"] = "node tools/scripts/sync-mobile-apps.mjs --check && node tools/scripts/guard-mobile-apps.mjs && pnpm -r --if-present typecheck";
  pkg.scripts["mobile:eas:build"] = "node tools/scripts/eas-build-mobile.mjs";

  return JSON.stringify(pkg, null, 2) + "\n";
}

if (apply) {
  writeText("tools/mobile/defineBthwaniExpoApp.js", factoryJsContent());
  writeText("tools/mobile/defineBthwaniExpoApp.d.ts", factoryDtsContent());

  if (fs.existsSync(abs("tools/mobile/defineBthwaniExpoApp.ts"))) {
    fs.rmSync(abs("tools/mobile/defineBthwaniExpoApp.ts"), { force: true });
  }

  for (const key of appKeys) {
    writeText(`${appDir(key)}/app.config.ts`, appConfig(key));
    writeJson(`${appDir(key)}/eas.json`, easTemplate);
  }

  writeText("package.json", updateRootScripts());

  console.log("PASS: mobile apps synchronized from tools/mobile");
  process.exit(0);
}

assertSame("tools/mobile/defineBthwaniExpoApp.js", factoryJsContent());
assertSame("tools/mobile/defineBthwaniExpoApp.d.ts", factoryDtsContent());

if (fs.existsSync(abs("tools/mobile/defineBthwaniExpoApp.ts"))) {
  throw new Error("tools/mobile/defineBthwaniExpoApp.ts must not exist; use .js CommonJS factory");
}

for (const key of appKeys) {
  assertSame(`${appDir(key)}/app.config.ts`, appConfig(key));
  assertSame(`${appDir(key)}/eas.json`, JSON.stringify(easTemplate, null, 2) + "\n");
}

assertSame("package.json", updateRootScripts());

console.log("PASS: mobile central contract is synchronized");
