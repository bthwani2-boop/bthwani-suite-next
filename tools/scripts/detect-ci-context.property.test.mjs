import assert from "node:assert/strict";
import test from "node:test";
import * as fc from "fast-check";
import { classifyFiles } from "./detect-ci-context.mjs";

const governedPath = fc.constantFrom(
  "package.json",
  "pnpm-lock.yaml",
  "apps/app-client/runtime/index.ts",
  "services/dsh/backend/internal/orders/service.go",
  "services/dsh/database/migrations/0001_init.sql",
  "services/wlt/backend/go.mod",
  "core/identity/backend/go.mod",
  "core/workforce/database/migrations/0001_init.sql",
  "core/platform-control/backend/go.sum",
  "core/providers/contracts/generated/providers.bundle.openapi.yaml",
  ".github/workflows/ci-check.yml",
  "tools/scripts/test-service-migration-runner.ps1",
);

test("CI classification is invariant to input order and duplicate file paths", () => {
  fc.assert(
    fc.property(fc.array(governedPath, { maxLength: 40 }), (files) => {
      const equivalent = [...files].reverse().flatMap((file) => [file, file]);
      assert.deepEqual(classifyFiles(files), classifyFiles(equivalent));
    }),
    { numRuns: 200 },
  );
});

test("full scope always activates every backend plus database/runtime/node proof", () => {
  fc.assert(
    fc.property(fc.constant(null), () => {
      const result = classifyFiles([], { fullScope: true });
      for (const key of [
        "node",
        "contracts",
        "backend",
        "database_changed",
        "runtime_required",
        "dsh",
        "wlt",
        "identity",
        "workforce",
        "platform",
        "providers",
      ]) {
        assert.equal(result[key], true, `${key} must be true in full scope`);
      }
    }),
    { numRuns: 25 },
  );
});

test("dependency manifests always route through dependency and Node verification", () => {
  const dependencyManifest = fc.constantFrom(
    "package.json",
    "pnpm-lock.yaml",
    "services/dsh/backend/go.mod",
    "services/wlt/backend/go.sum",
    "core/identity/backend/go.mod",
  );

  fc.assert(
    fc.property(dependencyManifest, (file) => {
      const result = classifyFiles([file]);
      assert.equal(result.dependency_changed, true);
      assert.equal(result.node, true);
      assert.equal(result.verification_required, true);
    }),
    { numRuns: 100 },
  );
});

test("migration authority changes force every backend, database, and runtime proof", () => {
  const migrationAuthority = fc.constantFrom(
    "infra/docker/scripts/schema-migration-runner.ps1",
    "tools/scripts/invoke-service-migrations.ps1",
    "tools/scripts/invoke-database-upgrade-truth.ps1",
    "tools/scripts/test-service-migration-runner.ps1",
    "tools/scripts/generate-migration-manifest.mjs",
    "tools/scripts/lib/migration-manifest-state.mjs",
    "tools/guards/migration-manifest-drift-gate.mjs",
    "tools/verification/migration-amendments.json",
  );

  fc.assert(
    fc.property(migrationAuthority, (file) => {
      const result = classifyFiles([file]);
      assert.equal(result.migration_authority, true);
      assert.equal(result.database_changed, true);
      assert.equal(result.backend, true);
      assert.equal(result.runtime_required, true);
      for (const key of ["dsh", "wlt", "identity", "workforce", "platform", "providers"]) {
        assert.equal(result[key], true, `${key} must be routed by migration authority`);
      }
    }),
    { numRuns: 100 },
  );
});