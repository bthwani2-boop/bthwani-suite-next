import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mediaRoot = path.join(repoRoot, "services/dsh/database/seeds/local/media");
const manifestPath = path.join(mediaRoot, "media-manifest.json");

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
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
  const actualChecksum = sha256(fs.readFileSync(absolutePath));
  if (actualChecksum !== expectedChecksum) {
    failures.push(`${fixtureId}: checksum mismatch for ${relativeSourcePath}; expected ${expectedChecksum}, received ${actualChecksum}`);
  }
}

if (failures.length > 0) {
  console.error("local-media-contract: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`local-media-contract: PASS (${manifest.media.length} governed assets)`);
