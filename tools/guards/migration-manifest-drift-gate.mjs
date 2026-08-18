#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");
const amendmentsRelative = "tools/verification/migration-amendments.json";
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
const requestedServices = serviceIndex >= 0 && args[serviceIndex + 1] ? [args[serviceIndex + 1]] : null;

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function portableSqlDigests(buffer) {
  const text = buffer.toString("utf8");
  const lf = text.replace(/\r\n?/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([sha256(buffer), sha256(Buffer.from(lf, "utf8")), sha256(Buffer.from(crlf, "utf8"))]);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
}

function loadAmendments() {
  const document = readJson(amendmentsRelative);
  const result = new Map();
  for (const amendment of document.amendments ?? []) {
    if (!amendment?.service || !amendment?.migrationId) continue;
    const key = `${amendment.service}:${amendment.migrationId}`;
    if (result.has(key)) throw new Error(`duplicate migration amendment: ${key}`);
    if (amendment.classification !== "PRE_RELEASE_UNAPPLIED_CORRECTION") {
      throw new Error(`unsupported migration amendment classification for ${key}`);
    }
    if (amendment.evidence?.productionApprovalEvidence !== false) {
      throw new Error(`migration amendment ${key} must explicitly declare productionApprovalEvidence=false`);
    }
    if (amendment.replacementSha256 && !/^[a-f0-9]{64}$/.test(amendment.replacementSha256)) {
      throw new Error(`migration amendment ${key} has invalid replacementSha256`);
    }
    for (const digest of amendment.acceptedHistoricalSha256 ?? []) {
      if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error(`migration amendment ${key} has invalid accepted historical digest`);
    }
    result.set(key, amendment);
  }
  return result;
}

const amendments = loadAmendments();

function loadManifest(service, directory, failures) {
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    failures.push(`missing manifest.json — regenerate with node tools/scripts/generate-migration-manifest.mjs --service ${service}`);
    return null;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const extensionPath = path.join(directory, "manifest.extensions.json");
  if (!fs.existsSync(extensionPath)) return manifest;

  const extension = JSON.parse(fs.readFileSync(extensionPath, "utf8"));
  if (extension.schemaVersion !== manifest.schemaVersion) failures.push("manifest.extensions.json schemaVersion mismatch");
  if (extension.service !== service || extension.extends !== "manifest.json") failures.push("manifest.extensions.json ownership mismatch");
  if (!Array.isArray(extension.migrations)) {
    failures.push("manifest.extensions.json must contain migrations[]");
    return manifest;
  }
  return { ...manifest, migrations: [...(manifest.migrations ?? []), ...extension.migrations] };
}

function checkService(service) {
  const failures = [];
  const relativeDirectory = servicePaths[service];
  const directory = path.join(repositoryRoot, relativeDirectory);
  const manifest = loadManifest(service, directory, failures);
  if (!manifest) return failures;

  if (manifest.service !== service) failures.push(`manifest service mismatch: expected=${service} actual=${manifest.service}`);
  if (manifest.ordering !== "explicit") failures.push("manifest ordering must be explicit");
  if (!Array.isArray(manifest.migrations) || manifest.migrations.length === 0) return [...failures, "manifest migrations[] must be non-empty"];

  const onDisk = new Set(fs.readdirSync(directory).filter((name) => name.endsWith(".sql")));
  const seenFiles = new Set();
  const seenOrdinals = new Set();
  const ordered = [...manifest.migrations].sort((a, b) => a.ordinal - b.ordinal);

  for (const [index, entry] of ordered.entries()) {
    const expectedOrdinal = index + 1;
    if (entry.ordinal !== expectedOrdinal) failures.push(`non-contiguous ordinal: expected=${expectedOrdinal} actual=${entry.ordinal} file=${entry.file}`);
    if (seenOrdinals.has(entry.ordinal)) failures.push(`duplicate ordinal: ${entry.ordinal}`);
    if (seenFiles.has(entry.file)) failures.push(`duplicate filename: ${entry.file}`);
    seenOrdinals.add(entry.ordinal);
    seenFiles.add(entry.file);

    if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? "")) failures.push(`invalid sha256: ${entry.file}`);
    if (!["HISTORICAL_IMMUTABLE", "ACTIVE"].includes(entry.state)) failures.push(`invalid state: ${entry.file}=${entry.state}`);
    if (!onDisk.has(entry.file)) {
      failures.push(`manifest file missing on disk: ${entry.file}`);
      continue;
    }

    const digests = portableSqlDigests(fs.readFileSync(path.join(directory, entry.file)));
    if (!digests.has(entry.sha256)) {
      const amendment = amendments.get(`${service}:${entry.file}`);
      if (!amendment?.replacementSha256 || !digests.has(amendment.replacementSha256)) {
        failures.push(`checksum drift: ${entry.file} recorded=${entry.sha256} amendment=${amendment?.replacementSha256 ?? "<none>"}`);
      }
    }
  }

  for (const file of onDisk) if (!seenFiles.has(file)) failures.push(`file not in manifest: ${file}`);

  const cutoverIndex = ordered.findIndex((entry) => entry.file === manifest.cutover);
  if (cutoverIndex < 0) failures.push(`cutover file '${manifest.cutover}' not found in manifest`);
  else {
    const historicalPrefixes = new Set(ordered.slice(0, cutoverIndex + 1).map((entry) => entry.historicalPrefix).filter(Boolean));
    for (const entry of ordered.slice(cutoverIndex + 1)) {
      if (entry.historicalPrefix && historicalPrefixes.has(entry.historicalPrefix)) {
        failures.push(`legacy numeric prefix collision after cutover: ${entry.file} reuses ${entry.historicalPrefix}`);
      }
    }
  }

  failures.push(...checkImmutableDigestHistory(service, relativeDirectory, manifest));
  return failures;
}

function git(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function resolveBaseline() {
  const baselineIndex = args.indexOf("--immutable-baseline");
  const requested = baselineIndex >= 0 ? args[baselineIndex + 1] : null;
  const candidates = requested
    ? [requested]
    : [process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null, "origin/master", "master"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const mergeBase = git(["merge-base", "HEAD", candidate]).trim();
      if (mergeBase) return mergeBase;
    } catch {}
  }
  return null;
}

function checkImmutableDigestHistory(service, relativeDirectory, manifest) {
  const baseline = resolveBaseline();
  if (!baseline) return [];
  const manifestRelative = `${relativeDirectory}/manifest.json`;
  let baselineManifest;
  try {
    baselineManifest = JSON.parse(git(["show", `${baseline}:${manifestRelative}`]));
  } catch {
    return [];
  }

  const historical = new Map((baselineManifest.migrations ?? []).filter((entry) => entry?.file && entry.sha256).map((entry) => [entry.file, entry.sha256]));
  const failures = [];
  for (const entry of manifest.migrations ?? []) {
    if (entry.state !== "HISTORICAL_IMMUTABLE") continue;
    const baselineDigest = historical.get(entry.file);
    if (!baselineDigest || baselineDigest === entry.sha256) continue;
    const accepted = new Set(amendments.get(`${service}:${entry.file}`)?.acceptedHistoricalSha256 ?? []);
    if (!accepted.has(baselineDigest)) {
      failures.push(`HISTORICAL_IMMUTABLE digest changed without accepted historical checksum: ${entry.file} baseline=${baselineDigest} current=${entry.sha256}`);
    }
  }
  return failures;
}

let failed = false;
for (const service of requestedServices ?? Object.keys(servicePaths)) {
  if (!servicePaths[service]) {
    console.error(`migration-manifest-drift-gate: unknown service '${service}'`);
    failed = true;
    continue;
  }
  const failures = checkService(service);
  if (failures.length) {
    failed = true;
    console.error(`migration-manifest-drift-gate: FAIL ${service}`);
    for (const failure of failures) console.error(`  - ${failure}`);
  } else {
    console.log(`migration-manifest-drift-gate: PASS ${service}`);
  }
}

if (failed) process.exit(1);
