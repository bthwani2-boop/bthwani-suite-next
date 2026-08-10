#!/usr/bin/env node
// Enforces migration-file/manifest integrity and the single governed database
// execution authority. Historical migrations are immutable by default. A
// pre-release correction is accepted only through migration-amendments.json.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");

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
const requestedServices = serviceIndex !== -1 && args[serviceIndex + 1] ? [args[serviceIndex + 1]] : null;

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function portableSqlDigests(buffer) {
  const text = buffer.toString("utf8");
  const lf = text.replace(/\r\n?/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([sha256(buffer), sha256(Buffer.from(lf, "utf8")), sha256(Buffer.from(crlf, "utf8"))]);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function requireFile(relativePath, failures) {
  const filePath = path.join(repositoryRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`${relativePath}: missing required authority file`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function walkPowerShell(relativeRoot) {
  const absoluteRoot = path.join(repositoryRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const results = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".ps1")) {
        results.push(path.relative(repositoryRoot, absolute).replaceAll(path.sep, "/"));
      }
    }
  };
  visit(absoluteRoot);
  return results;
}

function loadAmendments() {
  const amendmentsPath = path.join(repositoryRoot, "governance/contracts/migration-amendments.json");
  if (!fs.existsSync(amendmentsPath)) return new Map();

  const document = JSON.parse(fs.readFileSync(amendmentsPath, "utf8"));
  const amendments = new Map();
  for (const amendment of document.amendments ?? []) {
    if (!amendment?.service || !amendment?.migrationId || !amendment?.replacementSha256) continue;
    const key = `${amendment.service}:${amendment.migrationId}`;
    if (amendments.has(key)) throw new Error(`duplicate migration amendment: ${key}`);
    if (amendment.classification !== "PRE_RELEASE_UNAPPLIED_CORRECTION") {
      throw new Error(`unsupported migration amendment classification for ${key}`);
    }
    if (amendment.evidence?.productionApprovalEvidence !== false) {
      throw new Error(`migration amendment ${key} must explicitly prove productionApprovalEvidence=false`);
    }
    if (!/^[a-f0-9]{64}$/.test(amendment.replacementSha256)) {
      throw new Error(`migration amendment ${key} has invalid replacementSha256`);
    }
    amendments.set(key, amendment);
  }
  return amendments;
}

const amendments = loadAmendments();

function loadManifestWithExtensions(service, dir, manifestPath, failures) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const extensionPath = path.join(dir, "manifest.extensions.json");
  if (!fs.existsSync(extensionPath)) return manifest;

  const extension = JSON.parse(fs.readFileSync(extensionPath, "utf8"));
  if (extension.schemaVersion !== manifest.schemaVersion) {
    failures.push("manifest.extensions.json schemaVersion must match manifest.json");
  }
  if (extension.service !== service || extension.extends !== "manifest.json") {
    failures.push("manifest.extensions.json must declare the same service and extends=manifest.json");
  }
  if (!Array.isArray(extension.migrations)) {
    failures.push("manifest.extensions.json must contain migrations[]");
    return manifest;
  }
  return { ...manifest, migrations: [...manifest.migrations, ...extension.migrations] };
}

function checkService(service) {
  const relativeDir = servicePaths[service];
  const dir = path.join(repositoryRoot, relativeDir);
  const manifestPath = path.join(dir, "manifest.json");
  const failures = [];

  if (!fs.existsSync(manifestPath)) {
    return {
      service,
      failures: [`missing ${relativeDir}/manifest.json — regenerate with: node tools/scripts/generate-migration-manifest.mjs --service ${service}`],
    };
  }

  const manifest = loadManifestWithExtensions(service, dir, manifestPath, failures);
  if (manifest.service !== service) failures.push(`manifest service mismatch: expected=${service} actual=${manifest.service}`);
  if (manifest.ordering !== "explicit") failures.push("manifest ordering must be explicit");
  if (!Array.isArray(manifest.migrations) || manifest.migrations.length === 0) {
    failures.push("manifest migrations[] must be non-empty");
    return { service, failures };
  }

  const onDisk = new Set(fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".sql")));
  const seenOrdinals = new Set();
  const seenFiles = new Set();
  const orderedEntries = [...manifest.migrations].sort((a, b) => a.ordinal - b.ordinal);

  orderedEntries.forEach((entry, index) => {
    const expectedOrdinal = index + 1;
    if (entry.ordinal !== expectedOrdinal) {
      failures.push(`non-contiguous ordinal: expected=${expectedOrdinal} actual=${entry.ordinal} file=${entry.file}`);
    }
    if (seenOrdinals.has(entry.ordinal)) failures.push(`duplicate ordinal: ${entry.ordinal}`);
    seenOrdinals.add(entry.ordinal);
    if (seenFiles.has(entry.file)) failures.push(`duplicate filename in manifest: ${entry.file}`);
    seenFiles.add(entry.file);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? "")) failures.push(`invalid sha256: ${entry.file}`);
    if (!["HISTORICAL_IMMUTABLE", "ACTIVE"].includes(entry.state)) failures.push(`invalid state: ${entry.file}=${entry.state}`);

    if (!onDisk.has(entry.file)) {
      failures.push(`manifest file missing on disk: ${entry.file}`);
      return;
    }
    const migration = fs.readFileSync(path.join(dir, entry.file));
    const acceptableDigests = portableSqlDigests(migration);
    if (!acceptableDigests.has(entry.sha256)) {
      const amendment = amendments.get(`${service}:${entry.file}`);
      if (!amendment || !acceptableDigests.has(amendment.replacementSha256)) {
        failures.push(
          `checksum drift: ${entry.file} recorded=${entry.sha256} amendment=${amendment?.replacementSha256 ?? "<none>"} actual=${sha256(migration)}`,
        );
      }
    }
  });

  for (const file of onDisk) {
    if (!seenFiles.has(file)) failures.push(`file not in manifest: ${file}`);
  }

  const cutoverIndex = manifest.migrations.findIndex((entry) => entry.file === manifest.cutover);
  if (cutoverIndex === -1) {
    failures.push(`cutover file '${manifest.cutover}' not found in manifest.migrations`);
  } else {
    const historicalPrefixes = new Set(
      manifest.migrations.slice(0, cutoverIndex + 1).map((entry) => entry.historicalPrefix).filter(Boolean),
    );
    for (const entry of manifest.migrations.slice(cutoverIndex + 1)) {
      if (entry.historicalPrefix && historicalPrefixes.has(entry.historicalPrefix)) {
        failures.push(`new legacy numeric prefix collision after cutover: ${entry.file} reuses prefix ${entry.historicalPrefix}`);
      }
    }
  }

  return { service, failures };
}

function checkGenericServiceMigrationWrapper() {
  const failures = [];
  const wrapperPath = "tools/scripts/invoke-service-migrations.ps1";
  const testPath = "tools/scripts/test-service-migration-runner.ps1";
  const wrapper = requireFile(wrapperPath, failures);
  const test = requireFile(testPath, failures);

  for (const [relative, content] of [[wrapperPath, wrapper], [testPath, test]]) {
    if (content.includes("runtime_schema_migrations")) {
      failures.push(`${relative}: must not own or assert runtime_schema_migrations`);
    }
  }
  if (!wrapper.includes("schema-migration-runner.ps1") || !wrapper.includes("Invoke-BthwaniGovernedMigrations")) {
    failures.push(`${wrapperPath}: must delegate to schema-migration-runner.ps1`);
  }
  if (!test.includes("manifest is mandatory") || !test.includes("legacy ledger conflict rejection")) {
    failures.push(`${testPath}: must prove manifest authority and legacy-ledger reconciliation`);
  }
  return failures;
}

function checkDatabaseExecutionAuthority() {
  const failures = [];
  const canonicalMigrationPath = "infra/docker/scripts/schema-migration-runner.ps1";
  const canonicalSeedPath = "tools/scripts/invoke-service-seeds.ps1";
  const runtimeMigrationPath = "infra/docker/scripts/invoke-runtime-database-migrations.ps1";
  const runtimeSeedPath = "infra/docker/scripts/invoke-runtime-database-seeds.ps1";
  const runtimePath = "infra/docker/scripts/runtime.ps1";
  const dshAdapterPath = "services/dsh/database/scripts/invoke-dsh-database.ps1";

  const canonicalMigration = requireFile(canonicalMigrationPath, failures);
  const canonicalSeed = requireFile(canonicalSeedPath, failures);
  const runtimeMigration = requireFile(runtimeMigrationPath, failures);
  const runtimeSeed = requireFile(runtimeSeedPath, failures);
  const runtime = requireFile(runtimePath, failures);
  const dshAdapter = requireFile(dshAdapterPath, failures);

  for (const requiredToken of [
    "Get-BthwaniMigrationManifestEntries",
    "Resolve-BthwaniGovernedMigrationPlan",
    "schema_migrations",
    "runtime_schema_migrations_legacy_retired",
    "bthwani_migration_ledger_legacy_retired",
    "LEGACY_IMPORTED_BTHWANI_LEDGER",
    "BTHWANI_MIGRATION_LEDGER_SCHEMA_CONFLICT",
    "BTHWANI_MIGRATION_LEDGER_FOREIGN_SERVICE_CONFLICT",
    "LEGACY_MIGRATION_LEDGER_CONFLICT",
  ]) {
    if (!canonicalMigration.includes(requiredToken)) failures.push(`${canonicalMigrationPath}: missing ${requiredToken}`);
  }
  if (!runtimeMigration.includes("schema-migration-runner.ps1") || !runtimeMigration.includes("Invoke-BthwaniGovernedMigrations")) {
    failures.push(`${runtimeMigrationPath}: must be a thin adapter to the canonical migration runner`);
  }

  for (const requiredToken of [
    "*.local.sql",
    "runtime_seed_history",
    "BEGIN;",
    "COMMIT;",
    'ValidateSet("auto", "url", "docker")',
    "Get-PortableSeedChecksum",
  ]) {
    if (!canonicalSeed.includes(requiredToken)) failures.push(`${canonicalSeedPath}: missing governed seed invariant ${requiredToken}`);
  }
  for (const forbiddenToken of ['-Filter "*.sql"', "runtime_seed_runs"]) {
    if (canonicalSeed.includes(forbiddenToken)) failures.push(`${canonicalSeedPath}: contains retired seed behavior ${forbiddenToken}`);
  }
  if (!runtimeSeed.includes("invoke-service-seeds.ps1") || !runtimeSeed.includes('Transport = "docker"')) {
    failures.push(`${runtimeSeedPath}: must be a thin Docker adapter to invoke-service-seeds.ps1`);
  }
  for (const forbiddenToken of ["function Invoke-ComposePsql", "CREATE TABLE IF NOT EXISTS runtime_seed_history", "BEGIN;"]) {
    if (runtimeSeed.includes(forbiddenToken)) failures.push(`${runtimeSeedPath}: reimplements canonical seed behavior ${forbiddenToken}`);
  }

  for (const forbiddenToken of ["function Invoke-SqlSeedDirectory", "runtime_schema_migrations", "runtime_seed_runs"]) {
    if (runtime.includes(forbiddenToken)) failures.push(`${runtimePath}: contains retired database authority ${forbiddenToken}`);
  }
  for (const requiredToken of ["$GovernedMigrationScript", "$GovernedSeedScript", "Invoke-GovernedMinioInit"]) {
    if (!runtime.includes(requiredToken)) failures.push(`${runtimePath}: missing delegated authority ${requiredToken}`);
  }

  for (const forbiddenToken of ["runtime_schema_migrations", "runtime_seed_runs", "Initialize-DshDatabaseLedgers", "Invoke-DshMigrations"]) {
    if (dshAdapter.includes(forbiddenToken)) failures.push(`${dshAdapterPath}: contains retired local engine ${forbiddenToken}`);
  }
  for (const requiredToken of ["invoke-runtime-database-migrations.ps1", "invoke-service-migrations.ps1", "invoke-service-seeds.ps1"]) {
    if (!dshAdapter.includes(requiredToken)) failures.push(`${dshAdapterPath}: missing canonical delegation ${requiredToken}`);
  }

  const thinAdapters = [
    "infra/docker/scripts/apply-dsh-store-discovery-db.ps1",
    "infra/docker/scripts/apply-dsh-central-catalog-seed.ps1",
  ];
  for (const adapterPath of thinAdapters) {
    const content = requireFile(adapterPath, failures);
    if (/\bpsql\b/i.test(content) || /database[\\/]migrations[\\/].+\.sql/i.test(content)) {
      failures.push(`${adapterPath}: compatibility adapter must not apply SQL directly`);
    }
  }

  for (const retiredPath of [
    "apps/mobile/converge-local-runtime-database.ps1",
    "apps/mobile/repair-wlt-migration-ledger.ps1",
  ]) {
    if (fs.existsSync(path.join(repositoryRoot, retiredPath))) {
      failures.push(`${retiredPath}: retired database repair authority must not exist`);
    }
  }

  const activeRoots = [
    "apps/mobile",
    "infra/docker/scripts",
    "services/dsh/database/scripts",
    "services/wlt/database/scripts",
    "tools/scripts",
  ];
  const legacyLedgerAllowlist = new Set([canonicalMigrationPath]);
  for (const root of activeRoots) {
    for (const relativePath of walkPowerShell(root)) {
      if (relativePath.includes("/test-") || path.basename(relativePath).startsWith("test-")) continue;
      const content = read(relativePath);
      if (content.includes("runtime_schema_migrations") && !legacyLedgerAllowlist.has(relativePath)) {
        failures.push(`${relativePath}: active script references retired runtime_schema_migrations`);
      }
      if (content.includes("runtime_seed_runs")) {
        failures.push(`${relativePath}: active script references retired runtime_seed_runs`);
      }
    }
  }

  return failures;
}

function checkDshFinancialSovereigntyMigrations() {
  const failures = [];
  const dshMigrationDir = path.join(repositoryRoot, servicePaths.dsh);
  const historicalException = "dsh-099_captain_dispatch_financial_eligibility.sql";
  const forbiddenCreations = [
    [/CREATE\s+TABLE[\s\S]{0,3000}dsh_platform_dispatch_balance_policy/i, "DSH_MUST_NOT_CREATE_DISPATCH_BALANCE_POLICY"],
    [/CREATE\s+TABLE[\s\S]{0,3000}dsh_captain_financial_eligibility[\s\S]{0,3000}(available_balance_minor_units|minimum_dispatch_balance_minor_units|minimum_cod_balance_minor_units|wallet_status)/i, "DSH_MUST_NOT_CREATE_WALLET_BALANCE_ELIGIBILITY_TRUTH"],
    [/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?dsh_captain_financial_eligibility[\s\S]{0,300}ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(available_balance_minor_units|minimum_dispatch_balance_minor_units|minimum_cod_balance_minor_units|wallet_status)\b/i, "DSH_MUST_NOT_ADD_WALLET_BALANCE_ELIGIBILITY_TRUTH"],
  ];

  for (const name of fs.readdirSync(dshMigrationDir).filter((entry) => entry.endsWith(".sql"))) {
    if (name === historicalException) continue;
    const relative = `${servicePaths.dsh}/${name}`;
    const content = fs.readFileSync(path.join(dshMigrationDir, name), "utf8");
    for (const [pattern, code] of forbiddenCreations) {
      if (pattern.test(content)) {
        failures.push(`${relative}: ${code}; DSH may store only opaque WLT eligibility decision metadata`);
      }
    }
  }
  return failures;
}

const targetServices = requestedServices ?? Object.keys(servicePaths);
let anyFailure = false;
for (const service of targetServices) {
  if (!servicePaths[service]) {
    console.error(`Unknown service '${service}'. Known: ${Object.keys(servicePaths).join(", ")}`);
    process.exitCode = 1;
    continue;
  }
  const result = checkService(service);
  if (result.failures.length > 0) {
    anyFailure = true;
    console.error(`migration-manifest-drift-gate: FAIL ${service}`);
    for (const failure of result.failures) console.error(`  - ${failure}`);
  } else {
    console.log(`migration-manifest-drift-gate: PASS ${service}`);
  }
}

for (const [scope, failures] of [
  ["generic-service-migration-wrapper", checkGenericServiceMigrationWrapper()],
  ["database-execution-authority", checkDatabaseExecutionAuthority()],
  ["dsh-financial-sovereignty", checkDshFinancialSovereigntyMigrations()],
]) {
  if (failures.length > 0) {
    anyFailure = true;
    console.error(`migration-manifest-drift-gate: FAIL ${scope}`);
    for (const failure of failures) console.error(`  - ${failure}`);
  } else {
    console.log(`migration-manifest-drift-gate: PASS ${scope}`);
  }
}

if (anyFailure) process.exit(1);
