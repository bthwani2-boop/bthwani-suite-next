import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const rootPath = path.join(repositoryRoot, "services/dsh/contracts/dsh.openapi.yaml");
const analyticsModulePath = path.join(repositoryRoot, "services/dsh/contracts/paths/analytics.paths.yaml");
const manifestPath = path.join(repositoryRoot, "services/dsh/contracts/dsh.modular.manifest.json");

const pathIds = [
  "preparation-sla",
  "captains",
  "field",
  "drill-down/orders",
  "financial-snapshot",
  "export.csv",
];

const responseSchemas = [
  "DshPreparationSlaAnalyticsResponse",
  "DshCaptainPerformanceAnalyticsResponse",
  "DshFieldPerformanceAnalyticsResponse",
  "DshOperationalAnalyticsDrilldownResponse",
  "DshWltFinancialAnalyticsSnapshotResponse",
  "DshWltFinancialAnalyticsUnavailableResponse",
];

const pathRefs = `  /dsh/operator/analytics/preparation-sla:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1preparation-sla"
  /dsh/operator/analytics/captains:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1captains"
  /dsh/operator/analytics/field:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1field"
  /dsh/operator/analytics/drill-down/orders:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1drill-down~1orders"
  /dsh/operator/analytics/financial-snapshot:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1financial-snapshot"
  /dsh/operator/analytics/export.csv:
    $ref: "./paths/analytics.paths.yaml#/~1dsh~1operator~1analytics~1export.csv"
`;

const schemaRefs = responseSchemas
  .map((schemaName) => `    ${schemaName}:\n      $ref: "./components/schemas/analytics.schemas.yaml#/${schemaName}"`)
  .join("\n") + "\n";

const partnerPathAnchor = "  /dsh/partner/analytics/performance:\n";
const partnerSchemaAnchor = "    DshPartnerPerformanceResponse:\n";

let root = await readFile(rootPath, "utf8");
let analyticsModule = await readFile(analyticsModulePath, "utf8");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

for (const pathId of pathIds) {
  const modulePath = `/dsh/operator/analytics/${pathId}:`;
  if (!analyticsModule.includes(modulePath)) {
    throw new Error(`analytics module is missing ${modulePath}`);
  }
}

for (const schemaName of responseSchemas) {
  const legacyRef = `../components/schemas/analytics.schemas.yaml#/${schemaName}`;
  const canonicalRef = `../dsh.openapi.yaml#/components/schemas/${schemaName}`;
  if (analyticsModule.includes(legacyRef)) {
    analyticsModule = analyticsModule.replaceAll(legacyRef, canonicalRef);
  }
  if (!analyticsModule.includes(canonicalRef)) {
    throw new Error(`analytics path module is missing canonical schema reference ${schemaName}`);
  }
}

const missingPaths = pathIds.filter(
  (pathId) => !root.includes(`  /dsh/operator/analytics/${pathId}:`),
);
if (missingPaths.length !== 0 && missingPaths.length !== pathIds.length) {
  throw new Error(`partial JRN-032 root path registration detected: missing ${missingPaths.join(", ")}`);
}
if (missingPaths.length === pathIds.length) {
  if (!root.includes(partnerPathAnchor)) {
    throw new Error("partner analytics path anchor was not found in dsh.openapi.yaml");
  }
  root = root.replace(partnerPathAnchor, `${pathRefs}${partnerPathAnchor}`);
}

const missingSchemas = responseSchemas.filter(
  (schemaName) => !root.includes(`    ${schemaName}:`),
);
if (missingSchemas.length !== 0 && missingSchemas.length !== responseSchemas.length) {
  throw new Error(`partial JRN-032 schema registration detected: missing ${missingSchemas.join(", ")}`);
}
if (missingSchemas.length === responseSchemas.length) {
  if (!root.includes(partnerSchemaAnchor)) {
    throw new Error("partner analytics schema anchor was not found in dsh.openapi.yaml");
  }
  root = root.replace(partnerSchemaAnchor, `${schemaRefs}${partnerSchemaAnchor}`);
}

manifest.pathCount = 275;
manifest.operationIdCount = 322;
manifest.componentCounts.schemas = 298;
manifest.pathDomains.analytics = 11;
manifest.schemaDomains.analytics = 10;

await Promise.all([
  writeFile(rootPath, root, "utf8"),
  writeFile(analyticsModulePath, analyticsModule, "utf8"),
  writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
]);

console.log(
  `JRN-032 OpenAPI registered: ${pathIds.length} paths, ${responseSchemas.length} response schemas, canonical refs, and manifest counts.`,
);
