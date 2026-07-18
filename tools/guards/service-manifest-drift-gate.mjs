import { fail, read } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];

const manifestFile = "services/dsh/service.manifest.ts";
const contractFile = "services/dsh/contracts/dsh.openapi.yaml";
const baseCapabilityMapFile = "services/dsh/capability-map.ts";
const extensionCapabilityMapFile = "services/dsh/capability-map.extensions.ts";
const capabilityMapFiles = [baseCapabilityMapFile, extensionCapabilityMapFile];

const manifest = read(manifestFile);
const contractOperations = parseOpenApiContract(contractFile)
  .map((operation) => operation.operationId)
  .filter(Boolean)
  .sort();
const contractSet = new Set(contractOperations);

if (!manifest.includes("capabilities: DSH_CAPABILITIES")) {
  violations.push({
    file: manifestFile,
    message:
      "MANIFEST_CAPABILITY_DRIFT: dshServiceManifest must expose the merged DSH_CAPABILITIES collection rather than concatenating base and extension entries",
  });
}

if (!manifest.includes("contractOperations: DSH_CONTRACT_OPERATIONS")) {
  violations.push({
    file: manifestFile,
    message:
      "MANIFEST_OPERATION_DRIFT: currentTruth.contractOperations must be derived from merged capability ownership",
  });
}

function parseCapabilities(file) {
  const content = read(file);
  const blocks =
    content.match(/\{\s*id:\s*"([^"]+)"[\s\S]*?contractOperations:\s*\[([\s\S]*?)\]/g) || [];

  return blocks.map((block) => {
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const operationsMatch = block.match(/contractOperations:\s*\[([\s\S]*?)\]/);
    return {
      id: idMatch?.[1] ?? "",
      operations: operationsMatch
        ? [...operationsMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
        : [],
      file,
    };
  });
}

const baseCapabilities = parseCapabilities(baseCapabilityMapFile);
const extensionCapabilities = parseCapabilities(extensionCapabilityMapFile);
const baseCapabilityIds = new Set(baseCapabilities.map((capability) => capability.id));
const extensionIds = new Set();

for (const extension of extensionCapabilities) {
  if (!baseCapabilityIds.has(extension.id)) {
    violations.push({
      file: extension.file,
      capabilityId: extension.id,
      message: `ORPHAN_CAPABILITY_EXTENSION: "${extension.id}" has no canonical capability in ${baseCapabilityMapFile}`,
    });
  }

  if (extensionIds.has(extension.id)) {
    violations.push({
      file: extension.file,
      capabilityId: extension.id,
      message: `DUPLICATE_CAPABILITY_EXTENSION: "${extension.id}" is extended more than once`,
    });
  }
  extensionIds.add(extension.id);
}

const operationsByCapability = new Map();
for (const capability of [...baseCapabilities, ...extensionCapabilities]) {
  if (!operationsByCapability.has(capability.id)) {
    operationsByCapability.set(capability.id, new Set());
  }
  const ownedOperations = operationsByCapability.get(capability.id);
  for (const operationId of capability.operations) {
    if (ownedOperations.has(operationId)) {
      violations.push({
        file: capability.file,
        capabilityId: capability.id,
        operationId,
        message: `DUPLICATE_CAPABILITY_OPERATION: "${operationId}" is repeated within merged capability "${capability.id}"`,
      });
    }
    ownedOperations.add(operationId);
  }
}

const ownersByOperation = new Map();
for (const [capabilityId, operations] of operationsByCapability.entries()) {
  for (const operationId of operations) {
    if (!ownersByOperation.has(operationId)) ownersByOperation.set(operationId, new Set());
    ownersByOperation.get(operationId).add(capabilityId);

    if (!contractSet.has(operationId)) {
      violations.push({
        file: capabilityMapFiles.join(", "),
        capabilityId,
        operationId,
        message: `STALE_CAPABILITY_OPERATION: "${operationId}" is owned by "${capabilityId}" but is absent from ${contractFile}`,
      });
    }
  }
}

for (const [operationId, owners] of ownersByOperation.entries()) {
  if (owners.size > 1) {
    violations.push({
      file: capabilityMapFiles.join(", "),
      operationId,
      currentOwner: [...owners].join(", "),
      message: `DUPLICATE_OPERATION_OWNERSHIP: "${operationId}" is owned by multiple canonical capabilities`,
    });
  }
}

for (const operationId of contractOperations) {
  if (!ownersByOperation.has(operationId)) {
    violations.push({
      file: capabilityMapFiles.join(", "),
      operationId,
      message: `UNOWNED_OPERATION: OpenAPI operationId "${operationId}" has no canonical DSH capability owner`,
    });
  }
}

fail(guardId, violations);
