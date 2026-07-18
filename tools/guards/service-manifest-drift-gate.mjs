import { fail, read } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];

const manifestFile = "services/dsh/service.manifest.ts";
const contractFile = "services/dsh/contracts/dsh.openapi.yaml";
const capabilityMapFiles = [
  "services/dsh/capability-map.ts",
  "services/dsh/capability-map.extensions.ts",
];

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

const opToCapabilities = new Map();
for (const capabilityMapFile of capabilityMapFiles) {
  const capabilityMapContent = read(capabilityMapFile);
  const capBlocks = capabilityMapContent.match(/\{\s*id:\s*"([^"]+)"[\s\S]*?contractOperations:\s*\[([\s\S]*?)\]/g) || [];

  for (const block of capBlocks) {
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const opsMatch = block.match(/contractOperations:\s*\[([\s\S]*?)\]/);
    if (!idMatch) continue;
    const capId = idMatch[1];
    const ops = opsMatch ? [...opsMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]) : [];

    for (const operationId of ops) {
      if (!opToCapabilities.has(operationId)) opToCapabilities.set(operationId, []);
      opToCapabilities.get(operationId).push(`${capId}@${capabilityMapFile}`);
    }
  }
}

for (const [operationId, owners] of opToCapabilities.entries()) {
  if (!contractSet.has(operationId)) {
    violations.push({
      file: owners[0]?.split("@")[1] ?? capabilityMapFiles[0],
      operationId,
      currentOwner: owners.join(", "),
      message: `STALE_CAPABILITY_OPERATION: Operation "${operationId}" is owned by "${owners.join(", ")}" but does not exist in OpenAPI`,
    });
  }
  if (owners.length > 1) {
    violations.push({
      file: capabilityMapFiles.join(", "),
      operationId,
      currentOwner: owners.join(", "),
      message: `DUPLICATE_OWNERSHIP: Operation "${operationId}" is owned by multiple capabilities: [${owners.join(", ")}]`,
    });
  }
}

for (const operationId of contractOperations) {
  if (!opToCapabilities.has(operationId)) {
    violations.push({
      file: capabilityMapFiles.join(", "),
      operationId,
      message: `UNOWNED_OPERATION: OpenAPI operationId "${operationId}" is not owned by any capability map`,
    });
  }
}

fail(guardId, violations);
