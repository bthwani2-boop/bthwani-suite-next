import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const app = process.argv[2];
const allowedApps = new Set(["app-client", "app-partner", "app-captain", "app-field"]);
if (!allowedApps.has(app)) {
  console.error(`export-mobile-app: expected one of ${[...allowedApps].join(", ")}`);
  process.exit(1);
}

const repoRoot = process.cwd();
const runtimeDir = path.join(repoRoot, "apps", app, "runtime");
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) {
  console.error("export-mobile-app: npm_execpath is unavailable; invoke through pnpm/Nx");
  process.exit(1);
}

function exportPlatform(platform) {
  const outputDir = path.join(os.tmpdir(), "bthwani-expo-export", app, platform);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(outputDir), { recursive: true });

  const result = spawnSync(
    process.execPath,
    [
      pnpmCli,
      "--dir",
      runtimeDir,
      "exec",
      "expo",
      "export",
      "--platform",
      platform,
      "--output-dir",
      outputDir,
      "--clear",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        CI: "1",
        COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      },
    },
  );

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error) {
    console.error(`export-mobile-app: ${app}/${platform} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`export-mobile-app: ${app}/${platform} failed with exit ${result.status}`);
    process.exit(result.status ?? 1);
  }

  const files = fs.readdirSync(outputDir, { recursive: true });
  if (files.length === 0) {
    console.error(`export-mobile-app: ${app}/${platform} produced no output`);
    process.exit(1);
  }
  console.log(`export-mobile-app: ${app}/${platform} PASS (${files.length} output entries)`);
}

for (const platform of ["android", "ios"]) exportPlatform(platform);
