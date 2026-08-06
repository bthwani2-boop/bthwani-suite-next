import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(content, needle, owner) {
  if (!content.includes(needle)) {
    fail(`${owner} must contain: ${needle}`);
  }
}

function forbidText(content, needle, owner) {
  if (content.includes(needle)) {
    fail(`${owner} must not contain: ${needle}`);
  }
}

function listSql(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) {
    fail(`missing SQL directory: ${relativeDirectory}`);
    return [];
  }
  return fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function parsePackage(relativePath) {
  const text = read(relativePath);
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is invalid JSON: ${error.message}`);
    return undefined;
  }
}

const databaseReadme = read("services/dsh/database/README.md");
requireText(databaseReadme, "seeds/local", "DSH database README");
requireText(databaseReadme, "staging", "DSH database README");
requireText(databaseReadme, "production", "DSH database README");
requireText(databaseReadme, "WLT", "DSH database README");

const runnerPath = "services/dsh/database/scripts/invoke-dsh-database.ps1";
const runnerVerificationPath = "services/dsh/database/scripts/test-dsh-migration-runner.ps1";
const serviceRunnerPath = "database/scripts/invoke-dsh-database.ps1";
const runtimePath = "infra/docker/scripts/runtime.ps1";
const runtimeMigrationPath = "infra/docker/scripts/invoke-runtime-database-migrations.ps1";
const runtimeSeedPath = "infra/docker/scripts/invoke-runtime-database-seeds.ps1";
const canonicalMigrationRunnerPath = "infra/docker/scripts/schema-migration-runner.ps1";
const canonicalSeedRunnerPath = "tools/scripts/invoke-service-seeds.ps1";

const runner = read(runnerPath);
for (const token of [
  "invoke-runtime-database-migrations.ps1",
  "invoke-service-migrations.ps1",
  "invoke-service-seeds.ps1",
  "schema_migrations",
  "runtime_seed_history",
  "AllowLocalSeeds",
  "--single-transaction",
  "Set-StrictMode",
  "Ensure-DockerDshPostgres",
]) {
  requireText(runner, token, runnerPath);
}
for (const retiredToken of [
  "runtime_schema_migrations",
  "runtime_seed_runs",
  "SingleTransaction",
  "CREATE INDEX CONCURRENTLY",
]) {
  forbidText(runner, retiredToken, runnerPath);
}

const canonicalMigrationRunner = read(canonicalMigrationRunnerPath);
for (const token of [
  "Get-BthwaniMigrationManifestEntries",
  "Resolve-BthwaniGovernedMigrationPlan",
  "schema_migrations",
  "runtime_schema_migrations_legacy_retired",
  "bthwani_migration_ledger_legacy_retired",
  "LEGACY_IMPORTED_BTHWANI_LEDGER",
  "BTHWANI_MIGRATION_LEDGER_SCHEMA_CONFLICT",
  "BTHWANI_MIGRATION_LEDGER_FOREIGN_SERVICE_CONFLICT",
  "LEGACY_MIGRATION_LEDGER_CONFLICT",
  "MIGRATION_CHECKSUM_MISMATCH",
  "DIRTY_MIGRATION_STATE",
]) {
  requireText(canonicalMigrationRunner, token, canonicalMigrationRunnerPath);
}

const runtimeMigrationRunner = read(runtimeMigrationPath);
requireText(runtimeMigrationRunner, "schema-migration-runner.ps1", runtimeMigrationPath);
requireText(runtimeMigrationRunner, "Invoke-BthwaniGovernedMigrations", runtimeMigrationPath);

const canonicalSeedRunner = read(canonicalSeedRunnerPath);
for (const token of [
  "*.local.sql",
  "runtime_seed_history",
  "BEGIN;",
  "COMMIT;",
  "AllowLocalSeeds",
  'ValidateSet("auto", "url", "docker")',
  "Get-PortableSeedChecksum",
]) {
  requireText(canonicalSeedRunner, token, canonicalSeedRunnerPath);
}
forbidText(canonicalSeedRunner, '-Filter "*.sql"', canonicalSeedRunnerPath);
forbidText(canonicalSeedRunner, "runtime_seed_runs", canonicalSeedRunnerPath);

const runtimeSeedRunner = read(runtimeSeedPath);
for (const token of ["invoke-service-seeds.ps1", 'Transport = "docker"', "DockerUser", "DockerDatabase"]) {
  requireText(runtimeSeedRunner, token, runtimeSeedPath);
}
for (const forbiddenToken of ["function Invoke-ComposePsql", "CREATE TABLE IF NOT EXISTS runtime_seed_history", "BEGIN;"]) {
  forbidText(runtimeSeedRunner, forbiddenToken, runtimeSeedPath);
}

const runtime = read(runtimePath);
for (const token of [
  "$GovernedMigrationScript",
  "$GovernedSeedScript",
  "Invoke-GovernedMigrations",
  "Invoke-GovernedSeeds",
  "-AllowLocalSeeds",
]) {
  requireText(runtime, token, runtimePath);
}
for (const retiredToken of ["function Invoke-SqlSeedDirectory", "runtime_schema_migrations", "runtime_seed_runs"]) {
  forbidText(runtime, retiredToken, runtimePath);
}

const runnerVerification = read(runnerVerificationPath);
requireText(runnerVerification, "checksum drift", runnerVerificationPath);
requireText(runnerVerification, "dsh_ci_atomicity_probe", runnerVerificationPath);
requireText(runnerVerification, "Atomic migration rollback", runnerVerificationPath);

const migrations = listSql("services/dsh/database/migrations");
if (migrations.length === 0) {
  fail("DSH must contain at least one migration");
}

const migrationNamePattern = /^dsh-\d{3}[a-z]?[-_][a-z0-9][a-z0-9_.-]*\.sql$/i;
const lowerNames = new Set();
for (const migration of migrations) {
  if (!migrationNamePattern.test(migration)) {
    fail(`migration filename violates the governed legacy-compatible pattern: ${migration}`);
  }
  const lowerName = migration.toLowerCase();
  if (lowerNames.has(lowerName)) {
    fail(`duplicate migration filename (case-insensitive): ${migration}`);
  }
  lowerNames.add(lowerName);

  const content = read(`services/dsh/database/migrations/${migration}`);
  if (content.trim().length === 0) {
    fail(`migration is empty: ${migration}`);
  }
  if (/^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/im.test(content)) {
    fail(`atomic migration contains CREATE INDEX CONCURRENTLY: ${migration}`);
  }
}

const trustedOperatorContextMigrationPath = "services/dsh/database/migrations/dsh-954_trusted_operator_context_session_context.sql";
const trustedOperatorContextMigration = read(trustedOperatorContextMigrationPath);
requireText(trustedOperatorContextMigration, "dsh_trusted_OperatorContext_context", trustedOperatorContextMigrationPath);
requireText(trustedOperatorContextMigration, "current_setting('bthwani.operator_context_id', TRUE)", trustedOperatorContextMigrationPath);
requireText(trustedOperatorContextMigration, "OperatorContext_OWNERSHIP_IMMUTABLE", trustedOperatorContextMigrationPath);
requireText(trustedOperatorContextMigration, "trg_dsh_partners_OperatorContext", trustedOperatorContextMigrationPath);
requireText(trustedOperatorContextMigration, "trg_dsh_stores_OperatorContext", trustedOperatorContextMigrationPath);

const testOperatorContextHelperPath = "services/dsh/backend/internal/testdb/operator_context_context.go";
const testOperatorContextHelper = read(testOperatorContextHelperPath);
requireText(testOperatorContextHelper, "DSH_REQUIRE_DB_TESTS", testOperatorContextHelperPath);
requireText(testOperatorContextHelper, "DSH_TEST_operator_context_id", testOperatorContextHelperPath);
requireText(testOperatorContextHelper, "PGOPTIONS", testOperatorContextHelperPath);
requireText(testOperatorContextHelper, "bthwani.operator_context_id", testOperatorContextHelperPath);
requireText(testOperatorContextHelper, 'os.Getenv("CI") == "true"', testOperatorContextHelperPath);

const databaseTestPackages = [
  "cart",
  "checkout",
  "checkoutfinanceoutbox",
  "dispatch",
  "fieldcommissionoutbox",
  "fieldreadiness",
  "marketing",
  "orders",
  "partnerdelivery",
  "partnerfleet",
  "partnerwltoutbox",
  "pickup",
  "platformpolicies",
  "store",
  "wltoutbox",
];
for (const packageName of databaseTestPackages) {
  const activatorPath = `services/dsh/backend/internal/${packageName}/operator_context_context_test.go`;
  const activator = read(activatorPath);
  requireText(activator, `package ${packageName}`, activatorPath);
  requireText(activator, "testdb.ConfigureTrustedOperatorContext()", activatorPath);
}

for (const suite of ["schema", "seed"]) {
  const tests = listSql(`services/dsh/database/tests/${suite}`);
  if (tests.length === 0) {
    fail(`DSH database ${suite} test suite is empty`);
  }
}

const indexesDirectory = path.join(root, "services/dsh/database/indexes");
if (fs.existsSync(indexesDirectory)) {
  const files = fs.readdirSync(indexesDirectory, { withFileTypes: true });
  if (files.length > 0) {
    fail("database/indexes must be absent or empty; operational indexes belong in migrations");
  }
}

const servicePackage = parsePackage("services/dsh/package.json");
if (servicePackage) {
  const scripts = servicePackage.scripts ?? {};
  for (const scriptName of [
    "database:migrate",
    "database:seed:local",
    "database:test",
    "database:test:seed",
    "database:contract",
  ]) {
    if (typeof scripts[scriptName] !== "string") {
      fail(`services/dsh/package.json is missing script: ${scriptName}`);
    }
  }
  requireText(scripts["database:migrate"] ?? "", serviceRunnerPath, "database:migrate");
  requireText(scripts["database:seed:local"] ?? "", serviceRunnerPath, "database:seed:local");
  requireText(scripts["database:seed:local"] ?? "", "AllowLocalSeeds", "database:seed:local");
  requireText(scripts["database:contract"] ?? "", "check-dsh-database-contract.mjs", "database:contract");
}

const rootPackage = parsePackage("package.json");
if (rootPackage) {
  const scripts = rootPackage.scripts ?? {};
  for (const scriptName of [
    "runtime:migrate",
    "runtime:seed",
    "database:dsh:test",
    "database:dsh:test:seed",
    "database:dsh:contract",
  ]) {
    if (typeof scripts[scriptName] !== "string") {
      fail(`package.json is missing script: ${scriptName}`);
    }
  }
  requireText(scripts["runtime:migrate"] ?? "", runtimePath, "runtime:migrate");
  requireText(scripts["runtime:migrate"] ?? "", "-Action migrate", "runtime:migrate");
  requireText(scripts["runtime:seed"] ?? "", runtimePath, "runtime:seed");
  requireText(scripts["runtime:seed"] ?? "", "-Action seed", "runtime:seed");
  requireText(scripts["database:dsh:contract"] ?? "", "check-dsh-database-contract.mjs", "database:dsh:contract");
}

const workflow = read(".github/workflows/dsh-database.yml");
requireText(workflow, runnerPath, "DSH database workflow");
requireText(workflow, runnerVerificationPath, "DSH database workflow runner verification");
requireText(workflow, '"package.json"', "DSH database workflow path routing");
requireText(workflow, "permissions:\n  contents: read", "DSH database workflow read-only permissions");
requireText(workflow, "DSH_TEST_operator_context_id: ci-dsh", "DSH database workflow test OperatorContext");
requireText(workflow, "Apply canonical DSH migrations", "DSH database workflow");
requireText(workflow, "Re-run canonical DSH migrations", "DSH database workflow");
requireText(workflow, "Verify DSH migration runner failure contracts", "DSH database workflow");
requireText(workflow, "Apply DSH local seeds twice", "DSH database workflow");
requireText(workflow, "Run DSH schema database contracts", "DSH database workflow");
requireText(workflow, "Run DSH seed database contracts", "DSH database workflow");
forbidText(workflow, "statuses: write", "DSH database workflow");
forbidText(workflow, "gh api --method POST", "DSH database workflow");
forbidText(workflow, "bthwani/dsh-database", "DSH database workflow");
forbidText(workflow, "ALTER DATABASE dsh_runtime SET bthwani.operator_context_id", "DSH database workflow");
forbidText(workflow, "Capture canonical contextual workflow source", "DSH database workflow");

for (const retiredPath of [
  "apps/mobile/converge-local-runtime-database.ps1",
  "apps/mobile/repair-wlt-migration-ledger.ps1",
]) {
  if (fs.existsSync(path.join(root, retiredPath))) {
    fail(`retired database repair authority must not exist: ${retiredPath}`);
  }
}

if (failures.length > 0) {
  console.error("DSH database contract: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `DSH database contract: PASS (${migrations.length} migrations, ${databaseTestPackages.length} OperatorContext-aware DB test packages, canonical migration/seed authority)`,
);
