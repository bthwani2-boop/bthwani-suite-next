import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  fail,
  listCodeFiles,
  listFiles,
  read,
  repoRoot,
} from "./_guard-utils.mjs";
import { loadCoverageOwnershipModel } from "../scripts/generate-sonar-node-coverage.mjs";

const SONAR_PROPERTIES = "sonar-project.properties";
const EXECUTABLE_SOURCE = /\.(?:[cm]?[jt]sx?)$/iu;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isUnderPrefix(file, prefix) {
  const normalizedPrefix = normalizePath(prefix).replace(/\/+$/u, "");
  return file === normalizedPrefix || file.startsWith(`${normalizedPrefix}/`);
}

function isVerificationOrGenerated(file, model) {
  if (
    file.includes("/node_modules/") ||
    file.includes("/generated/") ||
    /(?:^|\/)generated\//iu.test(file) ||
    /\.d\.ts$/iu.test(file) ||
    /(?:^|\/)(?:test|tests|__tests__)\//iu.test(file) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/iu.test(file)
  ) return true;
  return model.verificationPrefixes.some((prefix) => isUnderPrefix(file, prefix)) ||
    model.generatedPrefixes.some((prefix) => isUnderPrefix(file, prefix));
}

function activePropertyLines(properties) {
  return String(properties ?? "")
    .split(/\r?\n/u)
    .map((line, index) => ({line, lineNumber: index + 1}))
    .filter(({line}) => !/^\s*#/u.test(line) && !/^\s*$/u.test(line));
}

function propertyValue(lines, key) {
  const entry = lines.findLast(({line}) => {
    const separator = line.indexOf("=");
    return separator >= 0 && line.slice(0, separator).trim() === key;
  });
  if (!entry) return null;
  return entry.line.slice(entry.line.indexOf("=") + 1).trim();
}

function propertyValues(lines, prefix) {
  const values = new Map();
  for (const {line} of lines) {
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    if (!key.startsWith(prefix)) continue;
    values.set(key.slice(prefix.length), line.slice(separator + 1).trim());
  }
  return values;
}

function discoverTsconfigFiles(files, model) {
  return files
    .map(normalizePath)
    .filter((file) => model.governedRoots.some((prefix) => isUnderPrefix(file, prefix)))
    .filter((file) => /^tsconfig(?:\.[^/]+)?\.json$/iu.test(path.posix.basename(file)))
    .sort();
}

export function auditSonarConfiguration({
  files,
  tsconfigFiles,
  model = loadCoverageOwnershipModel(),
  sonarProperties,
}) {
  const violations = [];
  const repositoryFiles = [...new Set((files ?? []).map(normalizePath).filter(Boolean))].sort();
  const productSources = repositoryFiles.filter((file) =>
    EXECUTABLE_SOURCE.test(file) &&
    model.governedRoots.some((prefix) => isUnderPrefix(file, prefix)) &&
    !isVerificationOrGenerated(file, model)
  );

  for (const file of productSources) {
    const authority = model.sourceAuthorities.find(({prefix}) => isUnderPrefix(file, prefix));
    if (!authority) {
      violations.push({
        file,
        message: "executable product source has no declared Sonar coverage owner",
      });
    }
  }

  const expectedTsconfigs = [...new Set((tsconfigFiles ?? []).map(normalizePath).filter(Boolean))]
    .filter((file) => model.governedRoots.some((prefix) => isUnderPrefix(file, prefix)))
    .filter((file) => /^tsconfig(?:\.[^/]+)?\.json$/iu.test(path.posix.basename(file)))
    .sort();
  const lines = activePropertyLines(sonarProperties);
  const configuredTsconfigs = (propertyValue(lines, "sonar.typescript.tsconfigPaths") ?? "")
    .split(",")
    .map(normalizePath)
    .filter(Boolean);
  const configuredSet = new Set(configuredTsconfigs);
  const expectedSet = new Set(expectedTsconfigs);

  for (const file of expectedTsconfigs) {
    if (!configuredSet.has(file)) {
      violations.push({file: SONAR_PROPERTIES, message: `missing TypeScript project in sonar.typescript.tsconfigPaths: ${file}`});
    }
  }
  for (const file of configuredTsconfigs) {
    if (!expectedSet.has(file)) {
      violations.push({file: SONAR_PROPERTIES, message: `TypeScript project is not a governed repository project: ${file}`});
    }
  }
  if (configuredTsconfigs.length !== configuredSet.size) {
    violations.push({file: SONAR_PROPERTIES, message: "sonar.typescript.tsconfigPaths contains duplicate projects"});
  }

  const qualityGateWait = propertyValue(lines, "sonar.qualitygate.wait");
  if (qualityGateWait !== "true") {
    violations.push({file: SONAR_PROPERTIES, message: "sonar.qualitygate.wait must remain true"});
  }

  const exclusions = (propertyValue(lines, "sonar.exclusions") ?? "")
    .split(",")
    .map((value) => value.trim());
  if (exclusions.includes("**/*.sql")) {
    const requiredAuthority = [
      "SQL exclusion authority:",
      "tools/scripts/check-dsh-database-contract.mjs",
      "tools/guards/migration-manifest-drift-gate.mjs",
    ];
    if (!requiredAuthority.every((marker) => String(sonarProperties ?? "").includes(marker))) {
      violations.push({file: SONAR_PROPERTIES, message: "SQL exclusion requires the canonical migration/seed authority markers"});
    }
  }

  const criteriaIds = new Set((propertyValue(lines, "sonar.issue.ignore.multicriteria") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
  const criteria = propertyValues(lines, "sonar.issue.ignore.multicriteria.");
  const ignoredGoSqlFiles = new Map();
  for (const id of criteriaIds) {
    const ruleKey = criteria.get(`${id}.ruleKey`);
    const resourceKey = criteria.get(`${id}.resourceKey`);
    if (ruleKey !== "go:S2077") continue;
    if (!resourceKey) {
      violations.push({file: SONAR_PROPERTIES, message: `go:S2077 suppression ${id} must declare an exact resourceKey`});
      continue;
    }
    if (/[?*\[\]]/u.test(resourceKey) || !/\.go$/u.test(resourceKey) || resourceKey.startsWith("../")) {
      violations.push({file: SONAR_PROPERTIES, message: `go:S2077 suppression ${id} must target one exact Go file`});
      continue;
    }
    const normalizedResource = normalizePath(resourceKey);
    if (!/^((?:core|services)\/[^/]+)\/backend\/.+\.go$/u.test(normalizedResource)) {
      violations.push({file: SONAR_PROPERTIES, message: `go:S2077 suppression ${id} must target a governed backend Go file`});
      continue;
    }
    if (!fs.existsSync(path.join(repoRoot, normalizedResource))) {
      violations.push({file: SONAR_PROPERTIES, message: `go:S2077 suppression ${id} targets a missing file: ${normalizedResource}`});
      continue;
    }
    if (ignoredGoSqlFiles.has(normalizedResource)) {
      violations.push({file: SONAR_PROPERTIES, message: `duplicate go:S2077 suppression target: ${normalizedResource}`});
    }
    ignoredGoSqlFiles.set(normalizedResource, id);
  }

  for (const {line, lineNumber} of lines) {
    if (/safeConstantSql/iu.test(line)) {
      violations.push({file: SONAR_PROPERTIES, line: lineNumber, message: "retired broad SQL suppression identifier is not permitted"});
    }
    if (/go:S2077/iu.test(line)) {
      const match = line.match(/^sonar\.issue\.ignore\.multicriteria\.([^.]+)\.ruleKey=/u);
      if (!match || !criteriaIds.has(match[1])) {
        violations.push({file: SONAR_PROPERTIES, line: lineNumber, message: "go:S2077 suppression must be an exact declared multicriteria entry"});
      }
    }
  }

  return violations;
}

function main() {
  const model = loadCoverageOwnershipModel();
  const codeFiles = listCodeFiles();
  const textFiles = model.governedRoots.flatMap((root) => listFiles(root));
  fail(
    "sonar-coverage-ownership-gate",
    auditSonarConfiguration({
      files: codeFiles,
      tsconfigFiles: discoverTsconfigFiles(textFiles, model),
      model,
      sonarProperties: read(SONAR_PROPERTIES),
    }),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
