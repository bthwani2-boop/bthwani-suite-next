import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appIndex = process.argv.indexOf("--app");
const appKey = appIndex >= 0 ? process.argv[appIndex + 1] : "";
const appDir = path.join(repoRoot, "apps", appKey, "runtime");
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `bthwani-${appKey || "mobile"}-export-`));

function fail(message) {
  console.error(`mobile-export-verification: ${message}`);
  process.exit(1);
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

try {
  if (!appKey || !fs.existsSync(appDir)) fail(`unknown or missing app runtime: ${appKey || "<none>"}`);
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    executable,
    ["--dir", appDir, "exec", "expo", "export", "--platform", "android", "--output-dir", outputDir, "--clear"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" },
      windowsHide: true,
    },
  );
  if (result.error) fail(`${appKey}: Expo export could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${appKey}: Expo export failed with exit code ${result.status}`);
  const outputFiles = filesUnder(outputDir);
  if (outputFiles.length === 0) fail(`${appKey}: Expo export produced no files`);
  if (!outputFiles.some((file) => /\.(?:js|hbc|json)$/.test(file))) fail(`${appKey}: Expo export produced no executable metadata or bundle`);
  console.log(`mobile-export-verification: PASS app=${appKey} files=${outputFiles.length}`);
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
