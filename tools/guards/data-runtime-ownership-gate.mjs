import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "data-runtime-ownership-gate";
const violations = [];

const DATA_RUNTIME_PACKAGE = "shared/data-runtime/package.json";
const DSH_PACKAGE = "services/dsh/package.json";
const DATA_RUNTIME_PERSISTENCE = "shared/data-runtime/src/persistence.ts";
const DATA_RUNTIME_QUEUE = "shared/data-runtime/src/offline-mutation-queue.ts";
const DATA_RUNTIME_NETINFO = "shared/data-runtime/src/netinfo-online-manager.ts";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function dependencyVersion(pkg, name) {
  return pkg.dependencies?.[name]
    ?? pkg.peerDependencies?.[name]
    ?? pkg.optionalDependencies?.[name]
    ?? pkg.devDependencies?.[name]
    ?? null;
}

function requireEqual(file, actual, expected, message) {
  if (actual !== expected) {
    violations.push({ file, message: `${message}; expected '${expected}', found '${actual ?? "missing"}'` });
  }
}

const dataRuntime = readJson(DATA_RUNTIME_PACKAGE);
const ownership = dataRuntime["x-bthwani-data-ownership"];

if (!ownership || typeof ownership !== "object" || Array.isArray(ownership)) {
  violations.push({ file: DATA_RUNTIME_PACKAGE, message: "missing x-bthwani-data-ownership contract" });
} else {
  requireEqual(DATA_RUNTIME_PACKAGE, ownership.status, "CANONICAL_DATA_RUNTIME", "data runtime ownership status drifted");
  requireEqual(DATA_RUNTIME_PACKAGE, ownership.policyOwner, "@bthwani/data-runtime", "data policy owner drifted");
  requireEqual(DATA_RUNTIME_PACKAGE, ownership.queryClient, "@tanstack/react-query", "query client owner drifted");
  requireEqual(DATA_RUNTIME_PACKAGE, ownership.queryPersistence, "@react-native-async-storage/async-storage", "query persistence engine drifted");
  requireEqual(DATA_RUNTIME_PACKAGE, ownership.offlineMutationQueue, "@react-native-async-storage/async-storage", "offline mutation queue persistence drifted");
  requireEqual(DATA_RUNTIME_PACKAGE, ownership.connectivity, "@react-native-community/netinfo", "connectivity provider drifted");

  const canonical = ownership.providerVersions ?? {};
  const asyncStorageVersion = canonical["@react-native-async-storage/async-storage"];
  const netInfoVersion = canonical["@react-native-community/netinfo"];
  const reactQueryVersion = canonical["@tanstack/react-query"];

  requireEqual(DATA_RUNTIME_PACKAGE, dependencyVersion(dataRuntime, "@react-native-async-storage/async-storage"), asyncStorageVersion, "data-runtime AsyncStorage must match its canonical provider version");
  requireEqual(DATA_RUNTIME_PACKAGE, dependencyVersion(dataRuntime, "@tanstack/react-query"), reactQueryVersion, "data-runtime React Query must match its canonical provider version");
  if (!dataRuntime.peerDependencies?.["@react-native-community/netinfo"]) {
    violations.push({ file: DATA_RUNTIME_PACKAGE, message: "NetInfo must remain an explicit peer provider for optional connectivity integration" });
  }

  const mobileProviders = Array.isArray(ownership.mobileRuntimeProviders) ? ownership.mobileRuntimeProviders : [];
  if (mobileProviders.length !== 4) {
    violations.push({ file: DATA_RUNTIME_PACKAGE, message: "mobileRuntimeProviders must enumerate exactly the four governed mobile runtimes" });
  }

  for (const packagePath of mobileProviders) {
    const runtimePackage = readJson(packagePath);
    requireEqual(packagePath, runtimePackage.dependencies?.["@bthwani/data-runtime"], "workspace:*", "mobile runtime must consume canonical @bthwani/data-runtime");
    requireEqual(packagePath, runtimePackage.dependencies?.["@react-native-async-storage/async-storage"], asyncStorageVersion, "mobile runtime AsyncStorage provider version drifted");
    requireEqual(packagePath, runtimePackage.dependencies?.["@react-native-community/netinfo"], netInfoVersion, "mobile runtime NetInfo provider version drifted");
    requireEqual(packagePath, runtimePackage.dependencies?.["@tanstack/react-query"], reactQueryVersion, "mobile runtime React Query declaration must stay version-aligned while direct declaration review is pending");
  }

  const sqlite = ownership.sqlite;
  if (!sqlite || sqlite.status !== "REQUIREMENT_PENDING" || sqlite.currentPersistenceAuthority !== false) {
    violations.push({ file: DATA_RUNTIME_PACKAGE, message: "SQLite must remain requirement-pending and must not silently become persistence authority" });
  }

  const persistenceSource = readText(DATA_RUNTIME_PERSISTENCE);
  const queueSource = readText(DATA_RUNTIME_QUEUE);
  const netInfoSource = readText(DATA_RUNTIME_NETINFO);
  for (const [file, source] of [
    [DATA_RUNTIME_PERSISTENCE, persistenceSource],
    [DATA_RUNTIME_QUEUE, queueSource],
  ]) {
    if (!source.includes('from "@react-native-async-storage/async-storage"')) {
      violations.push({ file, message: "current persistence contract says AsyncStorage is authoritative, but the implementation no longer imports it" });
    }
    if (source.includes("expo-sqlite")) {
      violations.push({ file, message: "expo-sqlite cannot become persistence authority before the explicit requirement decision is closed" });
    }
  }
  if (!netInfoSource.includes('require("@react-native-community/netinfo")')) {
    violations.push({ file: DATA_RUNTIME_NETINFO, message: "connectivity contract says NetInfo is the provider, but the implementation no longer resolves it" });
  }

  const dsh = readJson(DSH_PACKAGE);
  if (dsh.dependencies?.["@tanstack/react-query"]) {
    violations.push({ file: DSH_PACKAGE, message: "@bthwani/dsh root must not become a second React Query owner; consume @bthwani/data-runtime instead" });
  }
  if (dsh.dependencies?.["expo-sqlite"] || dsh.peerDependencies?.["expo-sqlite"]) {
    violations.push({ file: DSH_PACKAGE, message: "@bthwani/dsh root must not acquire SQLite while relational persistence is requirement-pending" });
  }

  const platformBoundary = dsh["x-bthwani-platform-boundary"];
  const quarantine = platformBoundary?.dataRuntimeLegacyQuarantine ?? {};
  for (const dependency of [
    "@react-native-async-storage/async-storage",
    "@react-native-community/netinfo",
  ]) {
    const current = dsh.dependencies?.[dependency] ?? null;
    const entry = quarantine[dependency];
    const canonicalVersion = canonical[dependency];

    if (current === null) {
      if (entry !== undefined) {
        violations.push({ file: DSH_PACKAGE, message: `stale dataRuntimeLegacyQuarantine entry '${dependency}' remains after the dependency was removed` });
      }
      continue;
    }

    if (!entry || typeof entry !== "object") {
      violations.push({ file: DSH_PACKAGE, message: `legacy DSH data dependency '${dependency}' must be explicitly quarantined until removed` });
      continue;
    }
    requireEqual(DSH_PACKAGE, entry.currentVersion, current, `quarantine currentVersion for '${dependency}' drifted`);
    requireEqual(DSH_PACKAGE, entry.canonicalVersion, canonicalVersion, `quarantine canonicalVersion for '${dependency}' drifted`);
    requireEqual(DSH_PACKAGE, entry.target, "REMOVE_FROM_DSH_ROOT_AFTER_CONSUMER_MIGRATION", `quarantine target for '${dependency}' drifted`);
  }
}

fail(guardId, violations);
