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
const runner = read(runnerPath);
requireText(runner, "runtime_schema_migrations", runnerPath);
requireText(runner, "runtime_seed_runs", runnerPath);
requireText(runner, "SingleTransaction", runnerPath);
requireText(runner, "--single-transaction", runnerPath);
requireText(runner, "AllowLocalSeeds", runnerPath);
requireText(runner, "CREATE INDEX CONCURRENTLY", runnerPath);
requireText(runner, "Set-StrictMode", runnerPath);
requireText(runner, "Ensure-DockerDshPostgres", runnerPath);

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

const trustedTenantMigrationPath = "services/dsh/database/migrations/dsh-954_trusted_tenant_session_context.sql";
const trustedTenantMigration = read(trustedTenantMigrationPath);
requireText(trustedTenantMigration, "dsh_trusted_tenant_context", trustedTenantMigrationPath);
requireText(trustedTenantMigration, "current_setting('bthwani.tenant_id', TRUE)", trustedTenantMigrationPath);
requireText(trustedTenantMigration, "TENANT_OWNERSHIP_IMMUTABLE", trustedTenantMigrationPath);
requireText(trustedTenantMigration, "trg_dsh_partners_tenant", trustedTenantMigrationPath);
requireText(trustedTenantMigration, "trg_dsh_stores_tenant", trustedTenantMigrationPath);

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
  requireText(scripts["runtime:migrate"] ?? "", runnerPath, "runtime:migrate");
  requireText(scripts["runtime:seed"] ?? "", runnerPath, "runtime:seed");
  requireText(scripts["runtime:seed"] ?? "", "AllowLocalSeeds", "runtime:seed");
  requireText(scripts["database:dsh:contract"] ?? "", "check-dsh-database-contract.mjs", "database:dsh:contract");
}

const workflow = read(".github/workflows/dsh-database.yml");
requireText(workflow, runnerPath, "DSH database workflow");
requireText(workflow, runnerVerificationPath, "DSH database workflow runner verification");
requireText(workflow, '"package.json"', "DSH database workflow path routing");
requireText(workflow, "Apply canonical DSH migrations", "DSH database workflow");
requireText(workflow, "Re-run canonical DSH migrations", "DSH database workflow");
requireText(workflow, "Verify DSH migration runner failure contracts", "DSH database workflow");
requireText(workflow, "Configure isolated CI trusted tenant context", "DSH database workflow");
requireText(workflow, "ALTER DATABASE dsh_runtime SET bthwani.tenant_id", "DSH database workflow");
requireText(workflow, "Clear isolated CI trusted tenant context", "DSH database workflow");
requireText(workflow, "ALTER DATABASE dsh_runtime RESET bthwani.tenant_id", "DSH database workflow");
requireText(workflow, "Apply DSH local seeds twice", "DSH database workflow");
requireText(workflow, "Run DSH schema database contracts", "DSH database workflow");
requireText(workflow, "Run DSH seed database contracts", "DSH database workflow");
requireText(workflow, "bthwani/dsh-database", "DSH database workflow status context");
requireText(workflow, "target_url", "DSH database workflow status target");

if (failures.length > 0) {
  console.error("DSH database contract: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`DSH database contract: PASS (${migrations.length} migrations)`);
