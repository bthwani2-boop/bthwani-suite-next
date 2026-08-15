import fs from "node:fs";
import path from "node:path";
import {
  fail,
  findImportSpecifiers,
  read,
  repoRoot,
} from "./_guard-utils.mjs";

const guardId = "dsh-native-dependency-inventory-gate";
const violations = [];
const packagePath = "services/dsh/package.json";
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, packagePath), "utf8"));
const boundary = pkg["x-bthwani-platform-boundary"] ?? {};
const quarantine = boundary.legacyNativeDependencyQuarantine ?? [];
const review = boundary.nativeDependencyReview ?? {};
const dataQuarantine = boundary.dataRuntimeLegacyQuarantine ?? {};

const allowedStatuses = new Set([
  "ACTIVE_DIRECT_CONSUMER",
  "LEGACY_DATA_PROVIDER_QUARANTINE",
  "CONSUMER_REVIEW_PENDING",
]);

const quarantineSet = new Set(quarantine);
const reviewKeys = Object.keys(review);

for (const dependency of quarantine) {
  const entry = review[dependency];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    violations.push({ file: packagePath, message: `native quarantine dependency '${dependency}' requires an explicit review entry` });
    continue;
  }
  if (!allowedStatuses.has(entry.status)) {
    violations.push({ file: packagePath, message: `native dependency '${dependency}' has unsupported review status '${entry.status}'` });
    continue;
  }
  if (entry.deletionAuthorized !== false) {
    violations.push({ file: packagePath, message: `native dependency '${dependency}' must keep deletionAuthorized=false until package-specific approval and closure evidence` });
  }

  if (entry.status === "LEGACY_DATA_PROVIDER_QUARANTINE" && !dataQuarantine[dependency]) {
    violations.push({ file: packagePath, message: `legacy data provider '${dependency}' must be present in dataRuntimeLegacyQuarantine` });
  }

  if (entry.status === "ACTIVE_DIRECT_CONSUMER") {
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      violations.push({ file: packagePath, message: `active native dependency '${dependency}' requires exact source evidence` });
      continue;
    }
    let proven = false;
    for (const evidencePath of entry.evidence) {
      const absolute = path.join(repoRoot, evidencePath);
      if (!fs.existsSync(absolute)) {
        violations.push({ file: packagePath, message: `native dependency '${dependency}' evidence path is missing: ${evidencePath}` });
        continue;
      }
      const content = read(evidencePath);
      const imports = findImportSpecifiers(content).map(({ specifier }) => specifier);
      if (imports.includes(dependency)) proven = true;
    }
    if (!proven) {
      violations.push({ file: packagePath, message: `active native dependency '${dependency}' has no evidence file importing it directly` });
    }
  }
}

for (const dependency of reviewKeys) {
  if (!quarantineSet.has(dependency)) {
    violations.push({ file: packagePath, message: `stale native dependency review entry '${dependency}' is not in legacyNativeDependencyQuarantine` });
  }
}

if (reviewKeys.length !== quarantine.length) {
  violations.push({ file: packagePath, message: "native dependency review must cover the quarantine list exactly" });
}

fail(guardId, violations);
