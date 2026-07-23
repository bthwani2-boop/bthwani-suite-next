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

const databaseReadme = read("services/dsh/database/README.md");
requireText(databaseReadme, "seeds/local", "DSH database README");
requireText(databaseReadme, "staging", "DSH database README");
requireText(databaseReadme, "production", "DSH database README");
requireText(databaseReadme, "WLT", "DSH database README");

const runnerPath = "services/dsh/database/scripts/invoke-dsh-database.ps1";
const runner = read(runnerPath);
requireText(runner, "runtime_schema_migrations", runnerPath);
requireText(runner, "runtime_seed_runs", runnerPath);
requireText(runner, "SingleTransaction", runnerPath);
requireText(runner, "--single-transaction", runnerPath);
requireText(runner, "AllowLocalSeeds", runnerPath);
requireText(runner, "CREATE INDEX CONCURRENTLY", runnerPath);

const migrations = listSql("services/dsh/database/migrations");
if (migrations.length === 0) {
  fail("DSH must contain at least one migration");
}

const migrationNamePattern = /^dsh-\d{3}[a-z]?_[a-z0-9][a-z0-9_-]*\.sql$/i;
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

for (const suite of ["schema", "seed"]) {
  const tests = listSql(`services/dsh/database/tests/${suite}`);
  if (tests.length === 0) {
    fail(`DSH database ${suite} test suite is empty`);
  }
}

const indexesDirectory = path.join(root, "services/dsh/database/indexes");
if (fs.existsSync(indexesDirectory)) {
  const executableIndexFiles = fs
    .readdirSync(indexesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"));
  if (executableIndexFiles.length > 0) {
    fail("database/indexes must not contain executable SQL; operational indexes belong in migrations");
  }
}

const runtime = read("infra/docker/scripts/runtime.ps1");
requireText(runtime, runnerPath, "runtime.ps1");
requireText(runtime, '-Action "migrate"', "runtime.ps1");
requireText(runtime, '-Action "seed"', "runtime.ps1");

const rootPackageText = read("package.json");
if (rootPackageText) {
  try {
    const rootPackage = JSON.parse(rootPackageText);
    const scripts = rootPackage.scripts ?? {};
    for (const scriptName of [
      "runtime:migrate",
      "runtime:seed",
      "database:dsh:test",
      "database:dsh:test:seed",
      "guard:dsh-database-contract",
    ]) {
      if (typeof scripts[scriptName] !== "string") {
        fail(`package.json is missing script: ${scriptName}`);
      }
    }
    requireText(scripts["runtime:migrate"] ?? "", runnerPath, "runtime:migrate");
    requireText(scripts["runtime:seed"] ?? "", runnerPath, "runtime:seed");
    requireText(scripts["runtime:seed"] ?? "", "AllowLocalSeeds", "runtime:seed");
  } catch (error) {
    fail(`package.json is invalid JSON: ${error.message}`);
  }
}

const servicePackageText = read("services/dsh/package.json");
if (servicePackageText) {
  try {
    const servicePackage = JSON.parse(servicePackageText);
    const scripts = servicePackage.scripts ?? {};
    for (const scriptName of ["database:migrate", "database:seed:local", "database:test", "database:test:seed", "database:guard"]) {
      if (typeof scripts[scriptName] !== "string") {
        fail(`services/dsh/package.json is missing script: ${scriptName}`);
      }
    }
  } catch (error) {
    fail(`services/dsh/package.json is invalid JSON: ${error.message}`);
  }
}

const ci = read(".github/workflows/ci.yml");
requireText(ci, runnerPath, "canonical CI workflow");
requireText(ci, "Apply canonical DSH migrations", "canonical CI workflow");
requireText(ci, "Apply DSH local seeds twice", "canonical CI workflow");
requireText(ci, "Run DSH schema database contracts", "canonical CI workflow");

if (failures.length > 0) {
  console.error("DSH database contract gate: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`DSH database contract gate: PASS (${migrations.length} migrations)`);
