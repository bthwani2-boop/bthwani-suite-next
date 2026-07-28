import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const phaseScript = await readFile(
  new URL("../scripts/invoke-runtime-phase.ps1", import.meta.url),
  "utf8",
);

test("runtime retries only the transient PostgreSQL bootstrap restart", () => {
  assert.match(phaseScript, /function Test-TransientPostgresBootstrapRestart/);
  assert.match(phaseScript, /\$Action -ne "up"/);
  assert.match(
    phaseScript,
    /database system is shutting down\|the database system is starting up/,
  );
  assert.match(phaseScript, /Retrying runtime:up once after stabilization/);
  assert.match(phaseScript, /Invoke-RuntimeBasePhase -Append/);
  assert.doesNotMatch(phaseScript, /while\s*\(/);
  assert.doesNotMatch(phaseScript, /for\s*\([^)]*retry/i);
});

test("runtime still fails closed after the one narrow retry", () => {
  assert.match(
    phaseScript,
    /if \(\$runtimeExitCode -ne 0\) \{\s*throw "Runtime script action '\$Action' failed with exit code \$runtimeExitCode"/s,
  );
  assert.equal(
    (phaseScript.match(/transient-postgres-bootstrap-retry: one retry/g) ?? []).length,
    1,
  );
});
