import { spawnSync } from "node:child_process";
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
    "utf8",
  );
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function writeJson(file, value) {
  writeText(file, JSON.stringify(value, null, 2));
}

function sameText(a, b) {
  const normalize = (value) =>
    value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n";
  return normalize(a) === normalize(b);
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

function runPnpm(args, cwd = root) {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) throw new Error("npm_execpath is unavailable; run through pnpm");
  const result = spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const manifest = readJson("tools/mobile/mobile-apps.manifest.json");
const easTemplate = readJson("tools/mobile/eas.template.json");
const appKeys = Object.keys(manifest.apps);

for (const key of appKeys) {
  const app = manifest.apps[key];
  for (const field of [
    "name",
    "slug",
    "scheme",
    "androidPackage",
    "iosBundleIdentifier",
    "projectId",
  ]) {
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

function factoryDtsContent() {
  const union = appKeys.map((key) => `"${key}"`).join(" | ");
  return `import type { ExpoConfig } from "expo/config";

export type BthwaniMobileAppKey = ${union};

export declare function defineBthwaniExpoApp(appKey: BthwaniMobileAppKey): ExpoConfig;
`;
}

const factoryJs = "tools/mobile/defineBthwaniExpoApp.js";
if (!fs.existsSync(abs(factoryJs))) {
  throw new Error(`${factoryJs}: missing sovereign Expo config factory`);
}

if (fs.existsSync(abs("tools/mobile/defineBthwaniExpoApp.ts"))) {
  throw new Error("tools/mobile/defineBthwaniExpoApp.ts must not exist; use the CommonJS .js factory");
}

if (apply) {
  // The executable factory is sovereign and is deliberately never generated here.
  writeText("tools/mobile/defineBthwaniExpoApp.d.ts", factoryDtsContent());

  for (const key of appKeys) {
    writeText(`${appDir(key)}/app.config.ts`, appConfig(key));
    writeJson(`${appDir(key)}/eas.json`, easTemplate);
  }

  console.log("PASS: generated mobile app configs synchronized without overwriting the Expo factory");
  process.exit(0);
}

assertSame("tools/mobile/defineBthwaniExpoApp.d.ts", factoryDtsContent());
for (const key of appKeys) {
  assertSame(`${appDir(key)}/app.config.ts`, appConfig(key));
  assertSame(`${appDir(key)}/eas.json`, JSON.stringify(easTemplate, null, 2) + "\n");
}

const lifecycle = process.env.npm_lifecycle_event ?? "";
if (lifecycle === "mobile:eas:preflight" || lifecycle === "mobile:eas:preflight:android") {
  const platform = process.env.MOBILE_PREFLIGHT_PLATFORM || "android";
  for (const key of appKeys) {
    const cwd = abs(appDir(key));
    runPnpm(["dlx", "expo-doctor@latest"], cwd);
    const outputDir = abs(`.tmp/eas-preflight/${key}/${platform}`);
    fs.rmSync(outputDir, { recursive: true, force: true });
    runPnpm(["exec", "expo", "export", "--platform", platform, "--output-dir", outputDir], cwd);
  }
  runNode(["tools/scripts/verify-mobile-prebuild.mjs", "--platform", platform]);
}

console.log("PASS: mobile generated contracts are synchronized");
