import fs from "node:fs";
import path from "node:path";
import {
  fail,
  findImportSpecifiers,
  lineNumber,
  listCodeFiles,
  read,
  repoRoot,
} from "./_guard-utils.mjs";

const guardId = "dsh-data-provider-quarantine-gate";
const violations = [];
const DSH_PACKAGE = "services/dsh/package.json";
const DSH_ROOT = "services/dsh/";
const LEGACY_PROVIDERS = {
  "@react-native-async-storage/async-storage": {
    canonicalVersion: "2.2.0",
    target: "REMOVE_FROM_DSH_ROOT_AFTER_CONSUMER_MIGRATION",
  },
  "@react-native-community/netinfo": {
    canonicalVersion: "12.0.1",
    target: "REMOVE_FROM_DSH_ROOT_AFTER_CONSUMER_MIGRATION",
  },
};

const dshPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, DSH_PACKAGE), "utf8"));
const boundary = dshPackage["x-bthwani-platform-boundary"];
const quarantine = boundary?.dataRuntimeLegacyQuarantine ?? {};

if (boundary?.canonicalNativeDependencyOwner !== "apps/*/runtime") {
  violations.push({
    file: DSH_PACKAGE,
    message: "DSH native dependencies must remain owned by apps/*/runtime",
  });
}

for (const [dependency, policy] of Object.entries(LEGACY_PROVIDERS)) {
  const declaredVersion = dshPackage.dependencies?.[dependency] ?? null;
  const entry = quarantine[dependency];

  if (declaredVersion === null) {
    if (entry !== undefined) {
      violations.push({
        file: DSH_PACKAGE,
        message: `stale quarantine entry '${dependency}' remains after dependency removal`,
      });
    }
    continue;
  }

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    violations.push({
      file: DSH_PACKAGE,
      message: `legacy provider '${dependency}' must remain explicitly quarantined until removal`,
    });
    continue;
  }

  if (entry.currentVersion !== declaredVersion) {
    violations.push({
      file: DSH_PACKAGE,
      message: `quarantine currentVersion for '${dependency}' must match package dependency '${declaredVersion}'`,
    });
  }
  if (entry.canonicalVersion !== policy.canonicalVersion) {
    violations.push({
      file: DSH_PACKAGE,
      message: `canonical version for '${dependency}' must remain '${policy.canonicalVersion}'`,
    });
  }
  if (entry.target !== policy.target) {
    violations.push({
      file: DSH_PACKAGE,
      message: `quarantine target for '${dependency}' must remain '${policy.target}'`,
    });
  }
}

for (const file of listCodeFiles()) {
  if (!file.startsWith(DSH_ROOT)) continue;
  const content = read(file);
  for (const { specifier, index } of findImportSpecifiers(content)) {
    if (!Object.prototype.hasOwnProperty.call(LEGACY_PROVIDERS, specifier)) continue;
    violations.push({
      file,
      line: lineNumber(content, index),
      message: `FORBIDDEN: direct legacy data-provider consumer '${specifier}' inside DSH; consume @bthwani/data-runtime or an explicit mobile adapter`,
    });
  }
}

fail(guardId, violations);
