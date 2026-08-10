// wlt-115_ledger_immutability.sql enforces J082: wlt_ledger_transactions,
// wlt_ledger_lines and wlt_ledger_entries reject UPDATE and DELETE outright.
//
// Regression origin: representative-wallets.local.sql deleted its ledger rows
// and re-upserted them with ON CONFLICT DO UPDATE. On an empty database the
// DELETE matched nothing and the INSERT never conflicted, so a first seed
// succeeded -- but every re-seed hit the immutability trigger and failed with
// "Ledger records are immutable", which broke bootstrap-dev idempotency.
//
// A seed must post to the ledger, never rewrite it.
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
    const sql = statements(fs.readFileSync(file, "utf8"));
    for (const table of IMMUTABLE_TABLES) {
      if (new RegExp(`DELETE\\s+FROM\\s+${table}\\b`, "i").test(sql)) {
        offenders.push(`${path.relative(repoRoot, file)}: DELETE FROM ${table}`);
      }
      if (new RegExp(`UPDATE\\s+${table}\\b`, "i").test(sql)) {
        offenders.push(`${path.relative(repoRoot, file)}: UPDATE ${table}`);
      }
      // ON CONFLICT ... DO UPDATE against a ledger table is a disguised UPDATE.
      const insertBlock = new RegExp(
        `INSERT\\s+INTO\\s+${table}\\b[\\s\\S]*?ON\\s+CONFLICT[\\s\\S]*?DO\\s+UPDATE`,
        "i",
      );
      if (insertBlock.test(sql)) {
        offenders.push(`${path.relative(repoRoot, file)}: ON CONFLICT DO UPDATE on ${table}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `ledger tables are append-only; post a new entry instead of rewriting:\n${offenders.join("\n")}`,
  );
});

test("the representative wallet fixture dedups on the natural posting key", () => {
  const fixture = path.join(seedRoot, "local/representative-wallets.local.sql");
  const sql = fs.readFileSync(fixture, "utf8");

  assert.match(
    sql,
    /ON CONFLICT \(operator_context_id, idempotency_key\)[\s\S]*?DO NOTHING/,
    "re-seeding must be a no-op on the ledger's unique posting key",
  );

  // Runtime-provisioned actors must yield a new posting rather than a rewrite,
  // so their entry id and idempotency key both derive from the actor id.
  for (const token of ["@@CAPTAIN_ACTOR_ID@@", "@@FIELD_ACTOR_ID@@"]) {
    assert.ok(
      sql.includes(`'wled-wallet-captain-' || '${token}'`) ||
        sql.includes(`'wled-wallet-field-' || '${token}'`),
      `${token} entry id must derive from the provisioned actor`,
    );
  }
});
