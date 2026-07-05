import { fail, read } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];

const manifestFile = "services/dsh/service.manifest.ts";
const contractFile = "services/dsh/contracts/dsh.openapi.yaml";

const manifest = read(manifestFile);
const contractOperations = parseOpenApiContract(contractFile)
  .map((operation) => operation.operationId)
  .filter(Boolean)
  .sort();

const contractOperationsBlock = manifest.match(/contractOperations:\s*\[([\s\S]*?)\n\s*\],/);
const manifestOperations = contractOperationsBlock
  ? [...contractOperationsBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]).sort()
  : [];

if (!contractOperationsBlock) {
  violations.push({
    file: manifestFile,
    message: "dshServiceManifest.currentTruth.contractOperations was not found",
  });
}

const manifestSet = new Set(manifestOperations);
const contractSet = new Set(contractOperations);

for (const operationId of contractOperations) {
  if (!manifestSet.has(operationId)) {
    violations.push({
      file: manifestFile,
      message: `MISSING_OPERATION: OpenAPI operationId "${operationId}" is not listed in currentTruth.contractOperations`,
    });
  }
}

for (const operationId of manifestOperations) {
  if (!contractSet.has(operationId)) {
    violations.push({
      file: manifestFile,
      message: `STALE_OPERATION: currentTruth.contractOperations lists "${operationId}" but it is not present in ${contractFile}`,
    });
  }
}

fail(guardId, violations);
