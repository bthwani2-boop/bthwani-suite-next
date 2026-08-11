import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json");
const evidenceRoot = path.join(repoRoot, ".diagnostics/mobile-evidence");

function fail(message) {
  throw new Error(`mobile-evidence-writer: ${message}`);
}

function normalize(values) {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const apps = Object.keys(manifest.apps ?? {}).sort();
  const knownTiers = normalize(manifest.verification?.evidenceTiers);
  if (apps.length !== 4) fail(`canonical mobile app inventory must contain exactly four apps, found ${apps.length}`);
  if (knownTiers.length === 0) fail("canonical mobile evidence tiers are missing");
  return { manifest, apps, knownTiers };
}

export function resolveEvidenceOutputPath(outputPath) {
  if (!String(outputPath ?? "").trim()) fail("--output is required");
  const absolute = path.resolve(repoRoot, outputPath);
  const relative = path.relative(evidenceRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`output must be a file below ${path.relative(repoRoot, evidenceRoot)}/`);
  }
  if (!absolute.endsWith(".json")) fail("output must be a .json file");
  return absolute;
}

export function createMobileEvidenceReceipt({ sourceSha, producer, platform, tiers, physicalDevice = false }) {
  const { apps, knownTiers } = readManifest();
  const sha = String(sourceSha ?? "").trim().toLowerCase();
  const producerName = String(producer ?? "").trim();
  const platformName = String(platform ?? "").trim().toLowerCase();
  const normalizedTiers = normalize(tiers);

  if (!/^[0-9a-f]{40}$/.test(sha)) fail("source SHA must be an exact 40-character commit SHA");
  if (!producerName) fail("producer is required");
  if (!['shared', 'android', 'ios'].includes(platformName)) fail("platform must be shared, android, or ios");
  if (normalizedTiers.length === 0) fail("at least one evidence tier is required");

  for (const tier of normalizedTiers) {
    if (!knownTiers.includes(tier)) fail(`unknown evidence tier '${tier}'`);
    if (tier.startsWith('mobile:android:') && platformName !== 'android') fail(`Android tier '${tier}' requires platform=android`);
    if (tier.startsWith('mobile:ios:') && platformName !== 'ios') fail(`iOS tier '${tier}' requires platform=ios`);
    if (tier.startsWith('mobile:shared:') && platformName !== 'shared') fail(`shared tier '${tier}' requires platform=shared`);
    if (tier.includes(':physical-') && physicalDevice !== true) fail(`physical tier '${tier}' requires physicalDevice=true`);
    if (tier === 'mobile:ios:simulator-launch' && physicalDevice === true) fail('iOS Simulator evidence cannot be physical-device evidence');
  }

  return {
    schemaVersion: 1,
    sourceSha: sha,
    result: "PASS",
    producer: producerName,
    apps,
    tiers: normalizedTiers,
    platform: platformName,
    physicalDevice: physicalDevice === true,
  };
}

export function writeMobileEvidenceReceipt({ outputPath, ...input }) {
  const output = resolveEvidenceOutputPath(outputPath);
  const receipt = createMobileEvidenceReceipt(input);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // "wx" is what makes the staging write exclusive: the file is created by this
  // call or the call fails, with no separate existence check that another writer
  // could win between. The name must still be unique per attempt -- keyed to the
  // process id it collided with any leftover file from an earlier crashed run
  // with the same id, and that stale file would have failed every later write
  // for good.
  const temporary = `${output}.tmp-${randomUUID()}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, output);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      // The staging file is disposable; the original failure is what matters.
    }
    throw error;
  }
  return { output, receipt };
}

function values(name) {
  const found = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) found.push(process.argv[++index]);
  }
  return found;
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirect) {
  try {
    const result = writeMobileEvidenceReceipt({
      outputPath: values("--output")[0],
      sourceSha: values("--sha")[0],
      producer: values("--producer")[0],
      platform: values("--platform")[0],
      tiers: values("--tier"),
      physicalDevice: process.argv.includes("--physical-device"),
    });
    process.stdout.write(`mobile-evidence-writer: PASS output=${path.relative(repoRoot, result.output)} tiers=${result.receipt.tiers.join(',')}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
