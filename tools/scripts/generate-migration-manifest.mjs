#!/usr/bin/env node
// Snapshots the real execution order of one service's SQL migrations into a
// committed manifest.json. The manifest locks immutable history; SQL files and
// the migration runner remain the execution truth.
//
// The real runner (tools/scripts/invoke-service-migrations.ps1) sorts with
// `Sort-Object { $_.Name.ToLowerInvariant() }, Name`, which is .NET's
// culture-aware string comparison, not ASCII/ordinal order. Historical
// migrations use several immutable filename conventions. To guarantee this
// manifest matches the real execution order exactly, the ordering is obtained
// by shelling out to the same Sort-Object call rather than approximating it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  loadExistingMigrationStates,
  resolveMigrationState,
} from "./lib/migration-manifest-state.mjs";

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

const manifestPath = path.join(migrationsDir, "manifest.json");
let existingManifest = null;
try {
  existingManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const existingStates = loadExistingMigrationStates(existingManifest, service);

function canonicalSqlBuffer(buffer) {
  const text = buffer.toString("utf8");
  return Buffer.from(text.replace(/\r\n?/g, "\n"), "utf8");
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

function readStableRegularFile(fullPath, relativePath) {
  let descriptor;
  try {
    const noFollow = process.platform === "win32" ? 0 : (fs.constants.O_NOFOLLOW ?? 0);
    descriptor = fs.openSync(fullPath, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(descriptor);
    if (!before.isFile()) throw new Error(`Migration is not a regular file: ${relativePath}`);
    const data = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs
    ) {
      throw new Error(`Migration changed while being read: ${relativePath}`);
    }
    return data;
  } catch (error) {
    if (["ENOENT", "ENOTDIR", "ELOOP"].includes(error?.code)) {
      throw new Error(`Migration disappeared or became unsafe while being read: ${relativePath}`, { cause: error });
    }
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

const files = sortedFileNamesViaPowerShell(migrationsDir);
if (files.length === 0) {
  console.error(`No .sql migrations found in ${relativeDir}`);
  process.exit(1);
}

const migrations = files.map((file, index) => {
  const fullPath = path.join(migrationsDir, file);
  const source = readStableRegularFile(fullPath, `${relativeDir}/${file}`);
  const sha256 = crypto.createHash("sha256").update(canonicalSqlBuffer(source)).digest("hex");
  const prefixMatch = file.match(/^[a-z]+-([0-9]+[a-z]?)_/i);
  return {
    ordinal: index + 1,
    file,
    sha256,
    historicalPrefix: prefixMatch ? prefixMatch[1] : null,
    state: resolveMigrationState(file, existingStates, existingManifest !== null),
  };
});

// Re-resolve the canonical execution order after all file reads. This makes
// directory membership/order changes during hashing a hard failure instead of
// allowing a manifest assembled from a mixed filesystem snapshot.
const filesAfterRead = sortedFileNamesViaPowerShell(migrationsDir);
if (filesAfterRead.length !== files.length || filesAfterRead.some((file, index) => file !== files[index])) {
  throw new Error("Migration file set/order changed while generating the manifest; refusing to write a mixed snapshot.");
}

const manifest = {
  schemaVersion: 1,
  service,
  ordering: "explicit",
  orderingSource: "Sort-Object { $_.Name.ToLowerInvariant() }, Name (tools/scripts/invoke-service-migrations.ps1), snapshotted here via PowerShell to avoid approximating .NET culture-aware string comparison in JS",
  cutover: files[files.length - 1],
  migrations,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${path.relative(repositoryRoot, manifestPath)} (${migrations.length} migrations)`);
