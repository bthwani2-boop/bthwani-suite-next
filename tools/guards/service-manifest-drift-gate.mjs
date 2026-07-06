import { fail, read } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];

const manifestFile = "services/dsh/service.manifest.ts";
const contractFile = "services/dsh/contracts/dsh.openapi.yaml";
const capabilityMapFile = "services/dsh/capability-map.ts";

// 1. Read manifest and extract operations
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

// Verify manifest vs contract
for (const operationId of contractOperations) {
  if (!manifestSet.has(operationId)) {
    violations.push({
      file: manifestFile,
      operationId,
      message: `MISSING_OPERATION: OpenAPI operationId "${operationId}" is not listed in currentTruth.contractOperations`,
    });
  }
}

for (const operationId of manifestOperations) {
  if (!contractSet.has(operationId)) {
    violations.push({
      file: manifestFile,
      operationId,
      message: `STALE_OPERATION: currentTruth.contractOperations lists "${operationId}" but it is not present in ${contractFile}`,
    });
  }
}

// 2. Read capability-map and extract operations
const capabilityMapContent = read(capabilityMapFile);
const capBlocks = capabilityMapContent.match(/\{\s*id:\s*"([^"]+)"[\s\S]*?contractOperations:\s*\[([\s\S]*?)\]/g) || [];

const opToCapabilities = new Map();

for (const block of capBlocks) {
  const idMatch = block.match(/id:\s*"([^"]+)"/);
  const opsMatch = block.match(/contractOperations:\s*\[([\s\S]*?)\]/);
  if (!idMatch) continue;
  const capId = idMatch[1];
  const ops = opsMatch ? [...opsMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]) : [];
  
  for (const op of ops) {
    if (!opToCapabilities.has(op)) {
      opToCapabilities.set(op, []);
    }
    opToCapabilities.get(op).push(capId);
  }
}

// Verify capability-map vs contract / manifest
for (const [op, owners] of opToCapabilities.entries()) {
  // Check if operation exists in OpenAPI
  if (!contractSet.has(op)) {
    violations.push({
      file: capabilityMapFile,
      operationId: op,
      currentOwner: owners.join(", "),
      message: `STALE_CAPABILITY_OPERATION: Operation "${op}" is owned by "${owners.join(", ")}" in capability-map but does not exist in OpenAPI`,
    });
  }
  
  // Check for duplicate ownership
  if (owners.length > 1) {
    violations.push({
      file: capabilityMapFile,
      operationId: op,
      currentOwner: owners.join(", "),
      message: `DUPLICATE_OWNERSHIP: Operation "${op}" is owned by multiple capabilities: [${owners.join(", ")}]`,
    });
  }
}

// Check for unowned OpenAPI operations
for (const operationId of contractOperations) {
  if (!opToCapabilities.has(operationId)) {
    violations.push({
      file: capabilityMapFile,
      operationId,
      message: `UNOWNED_OPERATION: OpenAPI operationId "${operationId}" is not owned by any capability in capability-map`,
    });
  }
}

fail(guardId, violations);
