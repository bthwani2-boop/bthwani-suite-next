import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json");

function normalizeStrings(values) {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

function fail(message) {
  throw new Error(`mobile-evidence-closure: ${message}`);
}

export function loadMobileEvidenceContract(file = manifestPath) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`cannot read canonical mobile manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
  const apps = Object.keys(manifest.apps ?? {}).sort();
  const knownTiers = normalizeStrings(manifest.verification?.evidenceTiers);
  const requiredTiers = normalizeStrings(manifest.verification?.finalClosureRequires);
  if (apps.length === 0) fail("canonical mobile manifest contains no apps");
  if (knownTiers.length === 0 || requiredTiers.length === 0) fail("canonical mobile evidence tiers are missing");
  for (const tier of requiredTiers) {
    if (!knownTiers.includes(tier)) fail(`final closure references unknown evidence tier '${tier}'`);
  }
  if (manifest.verification?.physicalDeviceRequired?.android !== true) fail("Android physical-device closure must remain required");
  if (manifest.verification?.physicalDeviceRequired?.ios !== true) fail("iOS physical-device closure must remain required");
  return { manifest, apps, knownTiers, requiredTiers };
}

export function validateMobileEvidenceReceipts({ expectedSha, receipts, contract = loadMobileEvidenceContract() }) {
  if (!/^[0-9a-f]{40}$/i.test(String(expectedSha ?? ""))) fail("expected SHA must be an exact 40-character commit SHA");
  if (!Array.isArray(receipts) || receipts.length === 0) fail("at least one evidence receipt is required");

  const proven = new Map();
  for (const { source, receipt } of receipts) {
    const label = source || "<receipt>";
    if (!receipt || receipt.schemaVersion !== 1) fail(`${label}: schemaVersion must be 1`);
    if (receipt.result !== "PASS") fail(`${label}: result must be PASS`);
    if (String(receipt.sourceSha ?? "").toLowerCase() !== expectedSha.toLowerCase()) {
      fail(`${label}: sourceSha mismatch expected=${expectedSha} actual=${receipt.sourceSha ?? ""}`);
    }
    if (!String(receipt.producer ?? "").trim()) fail(`${label}: producer is required`);
    const apps = normalizeStrings(receipt.apps);
    if (JSON.stringify(apps) !== JSON.stringify(contract.apps)) {
      fail(`${label}: app inventory mismatch expected=${contract.apps.join(",")} actual=${apps.join(",")}`);
    }
    const tiers = normalizeStrings(receipt.tiers);
    if (tiers.length === 0) fail(`${label}: no evidence tiers declared`);
    for (const tier of tiers) {
      if (!contract.knownTiers.includes(tier)) fail(`${label}: unknown evidence tier '${tier}'`);
      if (proven.has(tier)) fail(`duplicate evidence tier '${tier}' in ${label} and ${proven.get(tier).source}`);

      const isPhysicalTier = tier.includes(":physical-");
      if (isPhysicalTier && receipt.physicalDevice !== true) {
        fail(`${label}: physical tier '${tier}' requires physicalDevice=true`);
      }
      if (tier === "mobile:ios:simulator-launch" && receipt.physicalDevice === true) {
        fail(`${label}: iOS Simulator evidence cannot be marked as a physical device`);
      }
      if (tier.startsWith("mobile:android:") && receipt.platform && receipt.platform !== "android") {
        fail(`${label}: Android tier '${tier}' has platform=${receipt.platform}`);
      }
      if (tier.startsWith("mobile:ios:") && receipt.platform && receipt.platform !== "ios") {
        fail(`${label}: iOS tier '${tier}' has platform=${receipt.platform}`);
      }
      proven.set(tier, { source: label, receipt });
    }
  }

  const missing = contract.requiredTiers.filter((tier) => !proven.has(tier));
  if (missing.length > 0) fail(`BLOCKED missing required tiers: ${missing.join(", ")}`);
  return { sourceSha: expectedSha, tiers: contract.requiredTiers, apps: contract.apps };
}

function readValues(name) {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[++index]);
  }
  return values;
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  try {
    const expectedSha = readValues("--sha")[0] ?? "";
    const receiptPaths = readValues("--receipt");
    const receipts = receiptPaths.map((receiptPath) => {
      const absolute = path.resolve(process.cwd(), receiptPath);
      if (!fs.existsSync(absolute)) fail(`receipt does not exist: ${receiptPath}`);
      try {
        return { source: receiptPath, receipt: JSON.parse(fs.readFileSync(absolute, "utf8")) };
      } catch (error) {
        fail(`${receiptPath}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    const result = validateMobileEvidenceReceipts({ expectedSha, receipts });
    process.stdout.write(`mobile-evidence-closure: PASS sha=${result.sourceSha} tiers=${result.tiers.join(",")}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
