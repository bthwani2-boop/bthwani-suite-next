import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("runtime closure converges governed databases before smoke", () => {
  const closure = read("tools/scripts/verify-mobile-runtime-closure.ps1");
  assert.match(closure, /pnpm run runtime:full:bootstrap-dev/);
  assert.match(closure, /pnpm run runtime:full:smoke/);
  assert.ok(
    closure.indexOf("pnpm run runtime:full:bootstrap-dev") <
      closure.indexOf("pnpm run runtime:full:smoke"),
    "governed bootstrap must precede runtime smoke",
  );
  assert.doesNotMatch(
    closure,
    /ensure-mobile-dev-runtime\.ps1/,
    "final runtime closure must not use health-only mobile readiness as its migration gate",
  );
});

test("full bootstrap is the explicit local ledger-rebuild lifecycle", () => {
  const packageJson = JSON.parse(read("package.json"));
  const command = packageJson.scripts?.["runtime:full:bootstrap-dev"] ?? "";
  assert.match(command, /-Action bootstrap-dev/);
  assert.match(command, /-Force/);

  const migrationRunner = read("infra/docker/scripts/invoke-runtime-database-migrations.ps1");
  assert.match(migrationRunner, /"runtime:full:bootstrap-dev"/);
  assert.match(migrationRunner, /GOVERNED_MIGRATION_LEDGER_CONFLICT/);
  assert.match(migrationRunner, /rebuild-runtime-service-database\.ps1/);
});
