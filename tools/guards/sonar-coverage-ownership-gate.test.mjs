import assert from "node:assert/strict";
import test from "node:test";
import { listCodeFiles, listFiles, read } from "./_guard-utils.mjs";
import { auditSonarConfiguration } from "./sonar-coverage-ownership-gate.mjs";
import { loadCoverageOwnershipModel } from "../scripts/generate-sonar-node-coverage.mjs";

const model = loadCoverageOwnershipModel();
const codeFiles = listCodeFiles();
const tsconfigFiles = model.governedRoots.flatMap((root) => listFiles(root))
  .filter((file) => /^tsconfig(?:\.[^/]+)?\.json$/iu.test(file.split("/").pop()));
const sonarProperties = read("sonar-project.properties");

test("repository Sonar source ownership and configuration are complete", () => {
  assert.deepEqual(auditSonarConfiguration({files: codeFiles, tsconfigFiles, model, sonarProperties}), []);
});

test("new executable product files fail without an ownership declaration", () => {
  const violations = auditSonarConfiguration({
    files: [...codeFiles, "apps/unowned-runtime.ts"],
    tsconfigFiles,
    model,
    sonarProperties,
  });
  assert.equal(violations.some(({file, message}) => file === "apps/unowned-runtime.ts" && message.includes("no declared Sonar coverage owner")), true);
});

test("new product TypeScript projects fail until Sonar lists their tsconfig", () => {
  const violations = auditSonarConfiguration({
    files: codeFiles,
    tsconfigFiles: [...tsconfigFiles, "apps/new-runtime/tsconfig.json"],
    model,
    sonarProperties,
  });
  assert.equal(violations.some(({message}) => message.includes("apps/new-runtime/tsconfig.json")), true);
});

test("generated-only TypeScript projects are excluded only through canonical ownership", () => {
  const violations = auditSonarConfiguration({
    files: codeFiles,
    tsconfigFiles: [...tsconfigFiles, "core/workforce/tsconfig.json"],
    model,
    sonarProperties,
  });
  assert.deepEqual(violations, []);
  assert.equal(model.tsconfigExclusions.includes("core/workforce/tsconfig.json"), true);
});

test("an excluded TypeScript project cannot be reintroduced into Sonar", () => {
  const violations = auditSonarConfiguration({
    files: codeFiles,
    tsconfigFiles,
    model,
    sonarProperties: sonarProperties.replace(
      "sonar.typescript.tsconfigPaths=",
      "sonar.typescript.tsconfigPaths=core/workforce/tsconfig.json,",
    ),
  });
  assert.equal(violations.some(({message}) => message.includes("excluded TypeScript project must not be configured")), true);
});

test("SQL exclusion without its canonical authority and disabled Quality Gate waiting fail closed", () => {
  const withoutSqlAuthority = sonarProperties
    .replace(/# SQL exclusion authority:[\s\S]*?# The S2077 entries below/u, "# The S2077 entries below")
    .replace("tools/scripts/check-dsh-database-contract.mjs", "retired-check-dsh-database-contract.mjs")
    .replace("tools/guards/migration-manifest-drift-gate.mjs", "retired-migration-manifest-drift-gate.mjs");
  const violations = auditSonarConfiguration({
    files: codeFiles,
    tsconfigFiles,
    model,
    sonarProperties: `${withoutSqlAuthority}\nsonar.qualitygate.wait=false`,
  });
  assert.equal(violations.some(({message}) => message.includes("sonar.qualitygate.wait must remain true")), true);
  assert.equal(violations.some(({message}) => message.includes("SQL exclusion requires")), true);
});

test("broad or unscoped S2077 suppression fails closed", () => {
  const violations = auditSonarConfiguration({
    files: codeFiles,
    tsconfigFiles,
    model,
    sonarProperties: `${sonarProperties
      .replace(
        "sonar.issue.ignore.multicriteria.goS2077File01.resourceKey=core/workforce/backend/internal/workforce/journey003_documents.go",
        "sonar.issue.ignore.multicriteria.goS2077File01.resourceKey=**/*.go",
      )}\nsonar.issue.ignore.multicriteria.safeConstantSql.ruleKey=go:S2077`,
  });
  assert.equal(violations.some(({message}) => message.includes("one exact Go file")), true);
  assert.equal(violations.some(({message}) => message.includes("retired broad SQL suppression")), true);
});
