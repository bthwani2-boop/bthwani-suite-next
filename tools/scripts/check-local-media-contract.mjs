import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mediaRoot = path.join(repoRoot, "services/dsh/database/seeds/local/media");
const manifestPath = path.join(mediaRoot, "media-manifest.json");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function validatePngStructure(buffer) {
  if (buffer.length < 45 || !buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return "missing a complete PNG signature/chunk structure";
  }
  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.subarray(12, 16).toString("ascii");
  if (ihdrLength !== 13 || ihdrType !== "IHDR") {
    return "does not start with a canonical IHDR chunk";
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width === 0 || height === 0) {
    return "declares a zero-width or zero-height PNG";
  }
  const iendType = buffer.subarray(buffer.length - 8, buffer.length - 4).toString("ascii");
  if (iendType !== "IEND") {
    return "does not end with an IEND chunk";
  }
  return null;
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Local media manifest is missing: ${path.relative(repoRoot, manifestPath)}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.media) || manifest.media.length === 0) {
  throw new Error("Local media manifest must contain at least one media item");
}

const failures = [];
const seenFixtureIds = new Set();
const seenPaths = new Set();

for (const item of manifest.media) {
  const fixtureId = String(item.fixtureId ?? "").trim();
  const relativeSourcePath = String(item.relativeSourcePath ?? "").trim().replaceAll("\\", "/");
  const expectedChecksum = String(item.expectedChecksum ?? "").trim().toLowerCase();

  if (!fixtureId) failures.push("manifest item has no fixtureId");
  else if (seenFixtureIds.has(fixtureId)) failures.push(`duplicate fixtureId: ${fixtureId}`);
  else seenFixtureIds.add(fixtureId);

  if (!relativeSourcePath || relativeSourcePath.startsWith("/") || relativeSourcePath.includes("..")) {
    failures.push(`${fixtureId || "<unknown>"}: invalid relativeSourcePath '${relativeSourcePath}'`);
    continue;
  }
  if (seenPaths.has(relativeSourcePath)) failures.push(`duplicate media path: ${relativeSourcePath}`);
  else seenPaths.add(relativeSourcePath);

  if (item.required !== true) continue;

  const absolutePath = path.join(mediaRoot, relativeSourcePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${fixtureId}: required file is missing: ${relativeSourcePath}`);
    continue;
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile() || stat.size === 0) {
    failures.push(`${fixtureId}: required file is empty or not a file: ${relativeSourcePath}`);
    continue;
  }
  if (!/^[a-f0-9]{64}$/.test(expectedChecksum)) {
    failures.push(`${fixtureId}: expectedChecksum must be a SHA-256 digest`);
    continue;
  }
  const contents = fs.readFileSync(absolutePath);
  const actualChecksum = sha256(contents);
  if (actualChecksum !== expectedChecksum) {
    failures.push(`${fixtureId}: checksum mismatch for ${relativeSourcePath}; expected ${expectedChecksum}, received ${actualChecksum}`);
  }
  if (String(item.mimeType ?? "").trim().toLowerCase() === "image/png") {
    const pngFailure = validatePngStructure(contents);
    if (pngFailure) failures.push(`${fixtureId}: invalid PNG ${relativeSourcePath}; ${pngFailure}`);
  }
}

if (failures.length > 0) {
  console.error("local-media-contract: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`local-media-contract: PASS (${manifest.media.length} governed assets)`);
