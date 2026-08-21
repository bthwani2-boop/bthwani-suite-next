import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mobileAppsManifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);
const appIndex = process.argv.indexOf("--app");
const appKey = appIndex >= 0 ? process.argv[appIndex + 1] : "";

function fail(message) {
  throw new Error(`mobile-export-verification: ${message}`);
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

function resolveExpoCli(appDir) {
  const appRequire = createRequire(path.join(appDir, "package.json"));
  let expoPackageJsonPath;
  try {
    expoPackageJsonPath = appRequire.resolve("expo/package.json");
  } catch (error) {
    fail(`Expo package could not be resolved from ${appDir}: ${error.message}`);
  }

  const expoPackageRoot = fs.realpathSync(path.dirname(expoPackageJsonPath));
  const expoPackage = JSON.parse(fs.readFileSync(expoPackageJsonPath, "utf8"));
  const expoBin = typeof expoPackage.bin === "string" ? expoPackage.bin : expoPackage.bin?.expo;
  if (!expoBin || path.isAbsolute(expoBin)) {
    fail("Expo package does not expose a valid package-local CLI entrypoint");
  }

  const expoCli = fs.realpathSync(path.resolve(expoPackageRoot, expoBin));
  const packagePrefix = `${expoPackageRoot}${path.sep}`;
  if (!expoCli.startsWith(packagePrefix) || !fs.statSync(expoCli).isFile()) {
    fail("Expo CLI entrypoint escapes the resolved Expo package boundary");
  }
  return expoCli;
}

let outputDir;
try {
  if (!appKey || !/^[a-z0-9-]+$/u.test(appKey) || !mobileAppsManifest.apps?.[appKey]) {
    fail(`unknown or missing app runtime: ${appKey || "<none>"}`);
  }

  const appDir = path.join(repoRoot, "apps", appKey, "runtime");
  const appsRoot = `${path.join(repoRoot, "apps")}${path.sep}`;
  if (!appDir.startsWith(appsRoot) || !fs.existsSync(path.join(appDir, "package.json"))) {
    fail(`missing app runtime: ${appKey}`);
  }

  const expoCli = resolveExpoCli(appDir);
  outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-mobile-export-"));
  const environment = {
    ...process.env,
    CI: "1",
    EXPO_NO_TELEMETRY: "1",
  };
  const result = spawnSync(
    process.execPath,
    [expoCli, "export", "--platform", "android", "--output-dir", outputDir],
    {
      cwd: appDir,
      stdio: "inherit",
      env: environment,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) fail(`${appKey}: Expo export could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${appKey}: Expo export failed with exit code ${result.status}`);

  const outputFiles = filesUnder(outputDir);
  if (outputFiles.length === 0) fail(`${appKey}: Expo export produced no files`);
  if (!outputFiles.some((file) => /\.(?:js|hbc|json)$/.test(file))) {
    fail(`${appKey}: Expo export produced no executable metadata or bundle`);
  }
  console.log(`mobile-export-verification: PASS app=${appKey} files=${outputFiles.length}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
}
