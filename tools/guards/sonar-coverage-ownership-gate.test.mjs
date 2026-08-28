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

test("broad SQL suppression and disabled Quality Gate waiting fail closed", () => {
  const violations = auditSonarConfiguration({
    files: codeFiles,
    tsconfigFiles,
    model,
    sonarProperties: `${sonarProperties}\nsonar.qualitygate.wait=false\nsonar.issue.ignore.multicriteria.safeConstantSql.ruleKey=go:S2077`,
  });
  assert.equal(violations.some(({message}) => message.includes("sonar.qualitygate.wait must remain true")), true);
  assert.equal(violations.some(({message}) => message.includes("broad go:S2077 suppression")), true);
});
