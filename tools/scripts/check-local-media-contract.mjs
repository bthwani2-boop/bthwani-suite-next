import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "services/dsh/database/seeds/media/local-media.manifest.json");
const mediaRoot = path.join(repoRoot, "services/dsh/database/seeds/local/media");
const trackedMediaPath = "services/dsh/database/seeds/local/media";
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const safeRelativePath = /^[a-z0-9][a-z0-9._/-]*$/u;

const modeArg = process.argv.find((argument) => argument.startsWith("--mode="));
const modeIndex = process.argv.indexOf("--mode");
const mode = modeArg?.slice("--mode=".length) ?? (modeIndex >= 0 ? process.argv[modeIndex + 1] : "contract");
if (!new Set(["contract", "runtime"]).has(mode)) {
  throw new Error(`Unsupported local media validation mode '${mode}'. Expected contract or runtime.`);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function inspectPng(buffer) {
  if (buffer.length < 45 || !buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return { failure: "missing a complete PNG signature/chunk structure" };
  }
  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.subarray(12, 16).toString("ascii");
  if (ihdrLength !== 13 || ihdrType !== "IHDR") {
    return { failure: "does not start with a canonical IHDR chunk" };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const iendType = buffer.subarray(buffer.length - 8, buffer.length - 4).toString("ascii");
  if (width === 0 || height === 0) return { failure: "declares a zero-width or zero-height PNG" };
  if (iendType !== "IEND") return { failure: "does not end with an IEND chunk" };
  return { width, height };
}

function listTrackedLocalMedia() {
  const result = spawnSync("git", ["-C", repoRoot, "ls-files", "--", trackedMediaPath], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Unable to prove local media tracking boundary: ${result.stderr || result.stdout}`);
  }
  return result.stdout.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Canonical local media manifest is missing: ${path.relative(repoRoot, manifestPath)}`);
}

const tracked = listTrackedLocalMedia();
if (tracked.length > 0) {
  throw new Error(`Local media runtime state must never be tracked by Git:\n- ${tracked.join("\n- ")}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.media) || manifest.media.length === 0) {
  throw new Error("Canonical local media manifest must contain a non-empty media array");
}

const failures = [];
const seenFixtureIds = new Set();
const seenPaths = new Set();
const requiredFields = [
  "fixtureId", "entityType", "entityLogicalKey", "role", "fileName", "relativeSourcePath",
  "mimeType", "expectedWidth", "expectedHeight", "expectedChecksum", "altAr", "altEn", "license", "required",
];

for (const item of manifest.media) {
  const fixtureId = String(item.fixtureId ?? "").trim();
  const declaredPath = String(item.relativeSourcePath ?? "").trim();
  const relativeSourcePath = declaredPath.replaceAll("\\", "/");
  const fileName = String(item.fileName ?? "").trim();
  const expectedChecksum = String(item.expectedChecksum ?? "").trim().toLowerCase();

  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || (typeof item[field] === "string" && !item[field].trim())) {
      failures.push(`${fixtureId || "<unknown>"}: missing manifest field ${field}`);
    }
  }
  if (!fixtureId) failures.push("manifest item has no fixtureId");
  else if (seenFixtureIds.has(fixtureId)) failures.push(`duplicate fixtureId: ${fixtureId}`);
  else seenFixtureIds.add(fixtureId);

  if (
    !relativeSourcePath || declaredPath !== relativeSourcePath || relativeSourcePath.startsWith("/") ||
    relativeSourcePath.includes("..") || relativeSourcePath.includes("//") || !safeRelativePath.test(relativeSourcePath)
  ) {
    failures.push(`${fixtureId || "<unknown>"}: invalid or shell-unsafe relativeSourcePath '${declaredPath}'`);
    continue;
  }
  if (seenPaths.has(relativeSourcePath)) failures.push(`duplicate media path: ${relativeSourcePath}`);
  else seenPaths.add(relativeSourcePath);

  if (!safeRelativePath.test(fileName) || fileName.includes("/")) {
    failures.push(`${fixtureId}: invalid or shell-unsafe fileName '${fileName}'`);
  }
  if (path.posix.basename(relativeSourcePath) !== fileName) {
    failures.push(`${fixtureId}: fileName does not match relativeSourcePath basename`);
  }
  if (!/^[a-f0-9]{64}$/u.test(expectedChecksum)) failures.push(`${fixtureId}: expectedChecksum must be a SHA-256 digest`);
  if (!Number.isInteger(item.expectedWidth) || item.expectedWidth <= 0) failures.push(`${fixtureId}: expectedWidth must be a positive integer`);
  if (!Number.isInteger(item.expectedHeight) || item.expectedHeight <= 0) failures.push(`${fixtureId}: expectedHeight must be a positive integer`);
  if (item.required !== true) failures.push(`${fixtureId}: governed local media must declare required=true`);
  if (String(item.license) !== "bthwani-local") failures.push(`${fixtureId}: local media license must be bthwani-local`);

  if (mode !== "runtime") continue;

  const absolutePath = path.join(mediaRoot, relativeSourcePath);
  let contents;
  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile() || stat.size === 0) {
      failures.push(`${fixtureId}: required local file is empty or not a file: ${relativeSourcePath}`);
      continue;
    }
    contents = fs.readFileSync(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      failures.push(`${fixtureId}: required local file is missing: ${relativeSourcePath}`);
      continue;
    }
    throw error;
  }

  if (sha256(contents) !== expectedChecksum) {
    failures.push(`${fixtureId}: checksum mismatch for ${relativeSourcePath}`);
  }
  if (String(item.mimeType).toLowerCase() === "image/png") {
    const inspected = inspectPng(contents);
    if (inspected.failure) failures.push(`${fixtureId}: invalid PNG ${relativeSourcePath}; ${inspected.failure}`);
    else if (inspected.width !== item.expectedWidth || inspected.height !== item.expectedHeight) {
      failures.push(`${fixtureId}: dimensions mismatch for ${relativeSourcePath}; expected ${item.expectedWidth}x${item.expectedHeight}, received ${inspected.width}x${inspected.height}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`local-media-contract: FAIL mode=${mode}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`local-media-contract: PASS mode=${mode} assets=${manifest.media.length} trackedRuntimeFiles=0`);
