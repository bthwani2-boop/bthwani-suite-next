// wlt-115_ledger_immutability.sql enforces J082: wlt_ledger_transactions,
// wlt_ledger_lines and wlt_ledger_entries reject UPDATE and DELETE outright.
// Any WLT seed that exists must therefore remain append-only; the canonical
// runtime seed authority may explicitly declare an empty local seed set.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const seedRoot = path.join(repoRoot, "services/wlt/database/seeds");
const immutabilityMigration = path.join(
  repoRoot,
  "services/wlt/database/migrations/wlt-115_ledger_immutability.sql",
);

const IMMUTABLE_TABLES = ["wlt_ledger_entries", "wlt_ledger_lines", "wlt_ledger_transactions"];

function seedFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return seedFiles(full);
      return entry.isFile() && entry.name.endsWith(".sql") ? [full] : [];
    });
}

// Strip comments so prose about the invariant is not mistaken for a statement.
function statements(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

test("the ledger immutability trigger still guards every ledger table", () => {
  const migration = fs.readFileSync(immutabilityMigration, "utf8");
  for (const table of IMMUTABLE_TABLES) {
    assert.match(
      migration,
      new RegExp(`BEFORE UPDATE OR DELETE ON ${table}`),
      `${table} must remain append-only`,
    );
  }
});

test("no WLT seed updates or deletes an immutable ledger table", () => {
  const offenders = [];

  for (const file of seedFiles(seedRoot)) {
    const sqlStatements = statements(fs.readFileSync(file, "utf8"))
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const table of IMMUTABLE_TABLES) {
      for (const statement of sqlStatements) {
        if (new RegExp(`DELETE\\s+FROM\\s+${table}\\b`, "i").test(statement)) {
          offenders.push(`${path.relative(repoRoot, file)}: DELETE FROM ${table}`);
        }
        if (new RegExp(`UPDATE\\s+${table}\\b`, "i").test(statement)) {
          offenders.push(`${path.relative(repoRoot, file)}: UPDATE ${table}`);
        }
        const insertBlock = new RegExp(
          `INSERT\\s+INTO\\s+${table}\\b[\\s\\S]*?ON\\s+CONFLICT[\\s\\S]*?DO\\s+UPDATE`,
          "i",
        );
        if (insertBlock.test(statement)) {
          offenders.push(`${path.relative(repoRoot, file)}: ON CONFLICT DO UPDATE on ${table}`);
        }
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `ledger tables are append-only; post a new entry instead of rewriting:\n${offenders.join("\n")}`,
  );
});
