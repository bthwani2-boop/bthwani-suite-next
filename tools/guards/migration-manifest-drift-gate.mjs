#!/usr/bin/env node
// Fails when a service's committed migrations/manifest.json diverges from
// the files actually on disk: unregistered files, missing files, checksum
// drift, duplicate ordinals/filenames, or a new legacy numeric-prefix
// collision introduced after the manifest's cutover file.
// Historical migrations are immutable; new migrations extend the manifest.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");

const servicePaths = {
  dsh: "services/dsh/database/migrations",
  wlt: "services/wlt/database/migrations",
  identity: "core/identity/database/migrations",
  workforce: "core/workforce/database/migrations",
  providers: "core/providers/database/migrations",
  "platform-control": "core/platform-control/database/migrations",
};

const args = process.argv.slice(2);
const serviceIndex = args.indexOf("--service");
const requestedServices = serviceIndex !== -1 && args[serviceIndex + 1] ? [args[serviceIndex + 1]] : null;

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Historical manifests were generated from both Windows and POSIX worktrees.
// Accept only newline-equivalent digests so the same SQL text is portable while
// any semantic, whitespace, ordering, or final-newline change still fails.
function portableSqlDigests(buffer) {
  const text = buffer.toString("utf8");
  const lf = text.replace(/\r\n?/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([sha256(buffer), sha256(Buffer.from(lf, "utf8")), sha256(Buffer.from(crlf, "utf8"))]);
}

function checkService(service) {
  const relativeDir = servicePaths[service];
  const dir = path.join(repositoryRoot, relativeDir);
  const manifestPath = path.join(dir, "manifest.json");
  const failures = [];

  // Every service listed in servicePaths carries a committed manifest as of
  // VC-130b; a missing one is a regression, never a skip.
  if (!fs.existsSync(manifestPath)) {
    return {
      service,
      failures: [`missing ${relativeDir}/manifest.json — regenerate with: node tools/scripts/generate-migration-manifest.mjs --service ${service}`],
    };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const onDisk = new Set(fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".sql")));

  const seenOrdinals = new Set();
  const seenFiles = new Set();
  for (const entry of manifest.migrations) {
    if (seenOrdinals.has(entry.ordinal)) failures.push(`duplicate ordinal: ${entry.ordinal}`);
    seenOrdinals.add(entry.ordinal);
    if (seenFiles.has(entry.file)) failures.push(`duplicate filename in manifest: ${entry.file}`);
    seenFiles.add(entry.file);

    if (!onDisk.has(entry.file)) {
      failures.push(`manifest file missing on disk: ${entry.file}`);
      continue;
    }
    const migration = fs.readFileSync(path.join(dir, entry.file));
    const acceptableDigests = portableSqlDigests(migration);
    if (!acceptableDigests.has(entry.sha256)) {
      failures.push(`checksum drift: ${entry.file} recorded=${entry.sha256} actual=${sha256(migration)}`);
    }
  }

  for (const file of onDisk) {
    if (!seenFiles.has(file)) failures.push(`file not in manifest: ${file}`);
  }

  const cutoverIndex = manifest.migrations.findIndex((entry) => entry.file === manifest.cutover);
  if (cutoverIndex === -1) {
    failures.push(`cutover file '${manifest.cutover}' not found in manifest.migrations`);
  } else {
    const historicalPrefixes = new Set(
      manifest.migrations.slice(0, cutoverIndex + 1).map((entry) => entry.historicalPrefix).filter(Boolean),
    );
    for (const entry of manifest.migrations.slice(cutoverIndex + 1)) {
      if (entry.historicalPrefix && historicalPrefixes.has(entry.historicalPrefix)) {
        failures.push(`new legacy numeric prefix collision after cutover: ${entry.file} reuses prefix ${entry.historicalPrefix}`);
      }
    }
  }

  return { service, failures };
}

const targetServices = requestedServices ?? Object.keys(servicePaths);
let anyFailure = false;
for (const service of targetServices) {
  if (!servicePaths[service]) {
    console.error(`Unknown service '${service}'. Known: ${Object.keys(servicePaths).join(", ")}`);
    process.exitCode = 1;
    continue;
  }
  const result = checkService(service);
  if (result.failures.length > 0) {
    anyFailure = true;
    console.error(`migration-manifest-drift-gate: FAIL ${service}`);
    for (const failure of result.failures) console.error(`  - ${failure}`);
  } else {
    console.log(`migration-manifest-drift-gate: PASS ${service} (${result.service})`);
  }
}

if (anyFailure) process.exit(1);
