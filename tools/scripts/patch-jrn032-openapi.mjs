import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const rootPath = path.join(repositoryRoot, "services/dsh/contracts/dsh.openapi.yaml");
const analyticsModulePath = path.join(repositoryRoot, "services/dsh/contracts/paths/analytics.paths.yaml");

const pathIds = [
  "preparation-sla",
  "captains",
  "field",
  "drill-down/orders",
  "financial-snapshot",
  "export.csv",
];

const refs = `  /dsh/operator/analytics/preparation-sla:
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

const partnerAnchor = "  /dsh/partner/analytics/performance:\n";
const root = await readFile(rootPath, "utf8");
const analyticsModule = await readFile(analyticsModulePath, "utf8");

for (const pathId of pathIds) {
  const modulePath = `/dsh/operator/analytics/${pathId}:`;
  if (!analyticsModule.includes(modulePath)) {
    throw new Error(`analytics module is missing ${modulePath}`);
  }
}

const missingRefs = pathIds.filter(
  (pathId) => !root.includes(`  /dsh/operator/analytics/${pathId}:`),
);

if (missingRefs.length === 0) {
  console.log("JRN-032 OpenAPI root paths are already registered.");
  process.exit(0);
}

if (missingRefs.length !== pathIds.length) {
  throw new Error(`partial JRN-032 root registration detected: missing ${missingRefs.join(", ")}`);
}

if (!root.includes(partnerAnchor)) {
  throw new Error("partner analytics anchor was not found in dsh.openapi.yaml");
}

const patched = root.replace(partnerAnchor, `${refs}${partnerAnchor}`);
if (patched === root) {
  throw new Error("JRN-032 OpenAPI root patch did not change the contract");
}

await writeFile(rootPath, patched, "utf8");
console.log(`Registered ${pathIds.length} JRN-032 paths in ${path.relative(repositoryRoot, rootPath)}.`);
