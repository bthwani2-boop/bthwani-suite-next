import assert from "node:assert/strict";
import test from "node:test";

import {
  loadExistingMigrationStates,
  resolveMigrationState,
} from "./migration-manifest-state.mjs";

test("manifest regeneration preserves governed migration states", () => {
  const states = loadExistingMigrationStates({
    service: "identity",
    migrations: [
      { file: "identity-001.sql", state: "HISTORICAL_IMMUTABLE" },
      { file: "identity-002.sql", state: "ACTIVE" },
    ],
  }, "identity");

  assert.equal(resolveMigrationState("identity-001.sql", states, true), "HISTORICAL_IMMUTABLE");
  assert.equal(resolveMigrationState("identity-002.sql", states, true), "ACTIVE");
});

test("new migrations are active while an initial historical snapshot remains immutable", () => {
  assert.equal(resolveMigrationState("identity-003.sql", new Map(), true), "ACTIVE");
  assert.equal(resolveMigrationState("identity-001.sql", new Map(), false), "HISTORICAL_IMMUTABLE");
});

test("invalid existing state fails closed", () => {
  assert.throws(
    () => loadExistingMigrationStates({
      service: "identity",
      migrations: [{ file: "identity-001.sql", state: "UNKNOWN" }],
    }, "identity"),
    /Existing migration state is invalid/,
  );
});
