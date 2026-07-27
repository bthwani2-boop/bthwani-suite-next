import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appIndex = process.argv.indexOf("--app");
const appKey = appIndex >= 0 ? process.argv[appIndex + 1] : "";
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/mobile/mobile-apps.manifest.json"), "utf8"));
const app = manifest.apps?.[appKey];
const appDir = path.join(repoRoot, "apps", appKey, "runtime");

function fail(message) {
  console.error(`mobile-runtime-contract: ${message}`);
  process.exit(1);
}

function requireFile(relative) {
  const absolute = path.join(appDir, relative);
  if (!fs.existsSync(absolute)) fail(`${appKey}: missing ${relative}`);
}

if (!app) fail(`unknown app '${appKey || "<none>"}'`);
for (const file of ["package.json", "index.js", "src/index.ts", "eas.json", "metro.config.cjs", "tsconfig.json"]) {
  requireFile(file);
}
if (!["app.config.js", "app.config.ts", "app.json"].some((file) => fs.existsSync(path.join(appDir, file)))) {
  fail(`${appKey}: missing Expo app configuration`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"));
for (const script of ["typecheck", "lint", "test", "build", "eas-build-pre-install"]) {
  if (!pkg.scripts?.[script]) fail(`${appKey}: missing required script '${script}'`);
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(executable, ["--dir", appDir, "exec", "expo", "config", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" },
  windowsHide: true,
});
if (result.error) fail(`${appKey}: Expo config could not start: ${result.error.message}`);
if (result.status !== 0) {
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  fail(`${appKey}: Expo config failed`);
}
const jsonStart = (result.stdout ?? "").indexOf("{");
if (jsonStart < 0) fail(`${appKey}: Expo config returned no JSON`);
const config = JSON.parse(result.stdout.slice(jsonStart));
if (config.extra?.appKey !== appKey) fail(`${appKey}: extra.appKey mismatch`);
if (config.android?.package !== app.androidPackage) fail(`${appKey}: Android package mismatch`);
if (config.ios?.bundleIdentifier !== app.iosBundleIdentifier) fail(`${appKey}: iOS bundle identifier mismatch`);
if (config.extra?.eas?.projectId !== app.projectId) fail(`${appKey}: EAS project ID mismatch`);
if (config.entryPoint !== "./index.js") fail(`${appKey}: entry point mismatch`);
console.log(`mobile-runtime-contract: PASS app=${appKey}`);
