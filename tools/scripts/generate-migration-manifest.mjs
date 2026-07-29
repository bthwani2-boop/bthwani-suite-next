#!/usr/bin/env node
// Snapshots the real execution order of one service's SQL migrations into a
// committed manifest.json. The manifest locks immutable history; SQL files and
// the migration runner remain the execution truth.
//
// The real runner (tools/scripts/invoke-service-migrations.ps1) sorts with
// `Sort-Object { $_.Name.ToLowerInvariant() }, Name`, which is .NET's
// culture-aware string comparison, not ASCII/ordinal order (verified: it
// disagrees with a plain lowercase JS sort on names like
// dsh-103_jrn_027_... vs dsh-103_jrn001_...). To guarantee this manifest
// matches the real execution order exactly, the ordering is obtained by
// shelling out to the same Sort-Object call rather than approximating it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "../..");

const args = process.argv.slice(2);
const serviceIndex = args.indexOf("--service");
if (serviceIndex === -1 || !args[serviceIndex + 1]) {
  console.error("Usage: node tools/scripts/generate-migration-manifest.mjs --service <name>");
  process.exit(1);
}
const service = args[serviceIndex + 1];

const servicePaths = {
  dsh: "services/dsh/database/migrations",
  wlt: "services/wlt/database/migrations",
  identity: "core/identity/database/migrations",
  workforce: "core/workforce/database/migrations",
  providers: "core/providers/database/migrations",
  "platform-control": "core/platform-control/database/migrations",
};

const relativeDir = servicePaths[service];
if (!relativeDir) {
  console.error(`Unknown service '${service}'. Known: ${Object.keys(servicePaths).join(", ")}`);
  process.exit(1);
}

const migrationsDir = path.join(repositoryRoot, relativeDir);
if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${relativeDir}`);
  process.exit(1);
}

function sortedFileNamesViaPowerShell(dir) {
  const script = `Get-ChildItem -LiteralPath '${dir.replaceAll("'", "''")}' -File -Filter '*.sql' | Sort-Object { $_.Name.ToLowerInvariant() }, Name | Select-Object -ExpandProperty Name`;
  const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`PowerShell sort failed: ${result.error?.message ?? result.stderr}`);
  }
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const files = sortedFileNamesViaPowerShell(migrationsDir);

if (files.length === 0) {
  console.error(`No .sql migrations found in ${relativeDir}`);
  process.exit(1);
}

const onDisk = new Set(fs.readdirSync(migrationsDir).filter((name) => name.toLowerCase().endsWith(".sql")));
if (onDisk.size !== files.length || [...onDisk].some((name) => !files.includes(name))) {
  throw new Error("PowerShell sort output does not match the on-disk .sql file set; refusing to write a manifest.");
}

const migrations = files.map((file, index) => {
  const fullPath = path.join(migrationsDir, file);
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
  const prefixMatch = file.match(/^[a-z]+-([0-9]+[a-z]?)_/i);
  return {
    ordinal: index + 1,
    file,
    sha256,
    historicalPrefix: prefixMatch ? prefixMatch[1] : null,
    state: "HISTORICAL_IMMUTABLE",
  };
});

const manifest = {
  schemaVersion: 1,
  service,
  ordering: "explicit",
  orderingSource: "Sort-Object { $_.Name.ToLowerInvariant() }, Name (tools/scripts/invoke-service-migrations.ps1), snapshotted here via PowerShell to avoid approximating .NET culture-aware string comparison in JS",
  cutover: files[files.length - 1],
  migrations,
};

const manifestPath = path.join(migrationsDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${path.relative(repositoryRoot, manifestPath)} (${migrations.length} migrations)`);
