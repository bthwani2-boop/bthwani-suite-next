#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { composeAllContexts, repositoryRoot } from "./openapi-context-composer.mjs";
import { resolvePackageManagerInvocation } from "./lib/package-manager-invocation.mjs";

const MATERIALIZATION_SCHEMA_VERSION = 1;
const registryPath = path.join(repositoryRoot, "governance/contracts/generated-client-registry.json");
const lockfilePath = path.join(repositoryRoot, "pnpm-lock.yaml");
const stampPath = path.join(repositoryRoot, ".artifacts/openapi/materialization.json");

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256Text(fs.readFileSync(filePath));
}

function normalizeText(value) {
  return String(value).replace(/\r\n/g, "\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readStamp() {
  if (!fs.existsSync(stampPath)) return undefined;
  try {
    return readJson(stampPath);
  } catch {
    return undefined;
  }
}

function artifactInventory(registry) {
  return [...new Set(
    registry.entries.flatMap((entry) => [entry.contract, entry.client]),
  )].sort();
}

function currentArtifactHashes(relativePaths) {
  const hashes = {};
  for (const relativePath of relativePaths) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return undefined;
    hashes[relativePath] = sha256File(absolutePath);
  }
  return hashes;
}

function sameHashes(expected, actual, relativePaths) {
  if (!expected || !actual) return false;
  return relativePaths.every((relativePath) => expected[relativePath] === actual[relativePath]);
}

function fail(message, result) {
  if (result?.stdout) process.stdout.write(result.stdout);
  if (result?.stderr) process.stderr.write(result.stderr);
  console.error(`openapi-materialization: FAIL ${message}`);
  process.exit(1);
}

const registry = readJson(registryPath);
const composition = await composeAllContexts({ write: false });
const sourceDigests = Object.fromEntries(
  composition.map((result) => [result.context, result.sourceDigest]),
);
const materializationKey = sha256Text(JSON.stringify({
  schemaVersion: MATERIALIZATION_SCHEMA_VERSION,
  registrySha256: sha256File(registryPath),
  lockfileSha256: sha256File(lockfilePath),
  sourceDigests,
}));
const relativeArtifacts = artifactInventory(registry);
const currentHashes = currentArtifactHashes(relativeArtifacts);
const stamp = readStamp();

if (
  stamp?.schemaVersion === MATERIALIZATION_SCHEMA_VERSION &&
  stamp.materializationKey === materializationKey &&
  sameHashes(stamp.artifacts, currentHashes, relativeArtifacts)
) {
  console.log(`openapi-materialization: PASS mode=reuse contexts=${composition.length} artifacts=${relativeArtifacts.length}`);
  process.exit(0);
}

const invocation = resolvePackageManagerInvocation(
  "pnpm",
  ["run", "openapi:generate:all"],
  process.env,
);
const result = spawnSync(invocation.executable, invocation.args, {
  cwd: repositoryRoot,
  env: { ...process.env, BTHWANI_OPENAPI_MATERIALIZING: "1" },
  encoding: "utf8",
  shell: false,
  windowsHide: true,
});

if (result.error) fail(`generation could not start: ${result.error.message}`, result);
if (result.signal) fail(`generation terminated by signal ${result.signal}`, result);
if (result.status !== 0) fail(`generation exited with code ${result.status ?? 1}`, result);

for (const composed of composition) {
  const bundlePath = path.join(repositoryRoot, composed.bundlePath);
  if (!fs.existsSync(bundlePath)) {
    fail(`missing materialized bundle ${composed.bundlePath}`);
  }
  const materialized = normalizeText(fs.readFileSync(bundlePath, "utf8"));
  const expected = normalizeText(composed.bundle.endsWith("\n") ? composed.bundle : `${composed.bundle}\n`);
  if (materialized !== expected) {
    fail(`${composed.context} bundle differs from deterministic composition`);
  }
}

const generatedHashes = currentArtifactHashes(relativeArtifacts);
if (!generatedHashes) fail("one or more registered generated artifacts are missing after generation");

fs.mkdirSync(path.dirname(stampPath), { recursive: true });
fs.writeFileSync(stampPath, `${JSON.stringify({
  schemaVersion: MATERIALIZATION_SCHEMA_VERSION,
  materializationKey,
  sourceDigests,
  artifacts: generatedHashes,
}, null, 2)}\n`, "utf8");

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
console.log(`openapi-materialization: PASS mode=regenerate contexts=${composition.length} artifacts=${relativeArtifacts.length}`);
