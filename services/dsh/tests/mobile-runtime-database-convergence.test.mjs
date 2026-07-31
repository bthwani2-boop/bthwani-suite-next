import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("mobile local database convergence", () => {
  const convergence = source("../../../apps/mobile/converge-local-runtime-database.ps1");
  const ensureRuntime = source("../../../apps/mobile/ensure-mobile-dev-runtime.ps1");
  const runtimeWrapper = source("../../../apps/mobile/invoke-runtime-phase.ps1");

  it("keeps the canonical migration runner as the only positive ledger writer", () => {
    assert.doesNotMatch(convergence, /INSERT\s+INTO\s+runtime_schema_migrations/i);
    assert.doesNotMatch(convergence, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+runtime_schema_migrations/i);
    assert.match(convergence, /DELETE\s+FROM\s+runtime_schema_migrations/i);
    assert.match(convergence, /migration_name\s*=\s*'dsh-024_wlt_delivery_outbox\.sql'/);
  });

  it("fails closed when the existing DSH outbox is structurally drifted", () => {
    assert.match(convergence, /expected_columns\(column_name, data_type, is_not_null\)/);
    assert.match(convergence, /constraint_record\.contype = 'p'/);
    assert.match(convergence, /constraint_record\.contype = 'u'/);
    assert.match(convergence, /constraint_record\.contype = 'f'/);
    assert.match(convergence, /constraint_record\.contype = 'c'/);
    assert.match(convergence, /RAISE EXCEPTION 'DSH-024 outbox schema is incomplete or drifted/);
  });

  it("repairs only legacy-owned service objects and does not seize extension objects", () => {
    assert.match(convergence, /pg_get_userbyid\(c\.relowner\) = '\$legacyOwner'/);
    assert.match(convergence, /pg_get_userbyid\(p\.proowner\) = '\$legacyOwner'/);
    assert.doesNotMatch(convergence, /pg_get_userbyid\(c\.relowner\) <> '\$role'/);
    assert.doesNotMatch(convergence, /REASSIGN OWNED BY/);
  });

  it("uses one ownership repair path for every service migration failure", () => {
    assert.match(runtimeWrapper, /DatabaseConvergenceScript = Join-Path \$PSScriptRoot 'converge-local-runtime-database\.ps1'/);
    assert.match(runtimeWrapper, /\(Identity\|Workforce\|DSH\|WLT\) migration failed/);
    assert.match(runtimeWrapper, /Invoke-LocalDatabaseConvergence/);
    assert.doesNotMatch(runtimeWrapper, /REASSIGN OWNED BY/);
    assert.doesNotMatch(runtimeWrapper, /ALTER DATABASE identity_runtime OWNER TO identity_runtime/);
  });

  it("blocks every canonical production-mode signal before Docker execution", () => {
    assert.match(convergence, /\[string\]\$env:NODE_ENV/);
    assert.match(convergence, /\[string\]\$env:ENVIRONMENT/);
    assert.match(convergence, /\[string\]\$env:BTHWANI_RUNTIME_MODE/);
    assert.match(convergence, /\$productionSignals -contains "production"/);
    assert.ok(
      convergence.indexOf('$productionSignals -contains "production"')
        < convergence.indexOf('docker compose @composeArgs up -d postgres'),
      "production guard must execute before Docker startup",
    );
  });

  it("runs database precondition convergence before starting application backends", () => {
    const convergenceStep = ensureRuntime.indexOf('mobile-runtime-database-convergence');
    const runtimeUpStep = ensureRuntime.indexOf('mobile-runtime-up');
    assert.ok(convergenceStep >= 0, "mobile database convergence step is missing");
    assert.ok(runtimeUpStep >= 0, "mobile runtime-up step is missing");
    assert.ok(convergenceStep < runtimeUpStep, "database convergence must precede backend startup");
  });
});
