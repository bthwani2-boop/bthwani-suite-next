import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];

const serviceRoot = "services/dsh";
const manifestFile = `${serviceRoot}/service.manifest.ts`;
const contractRegistryFile = `${serviceRoot}/contracts/contract-registry.ts`;
const baseCapabilityMapFile = `${serviceRoot}/capability-map.ts`;
const extensionCapabilityMapFile = `${serviceRoot}/capability-map.extensions.ts`;
const capabilityMapFiles = [baseCapabilityMapFile, extensionCapabilityMapFile];

const manifest = read(manifestFile);
const registrySource = read(contractRegistryFile);

if (!manifest.includes("capabilities: DSH_CAPABILITIES")) {
  violations.push({
    file: manifestFile,
    message:
      "MANIFEST_CAPABILITY_DRIFT: dshServiceManifest must expose the merged DSH_CAPABILITIES collection",
  });
}
if (!manifest.includes("contracts: DSH_CONTRACT_REGISTRY.map")) {
  violations.push({
    file: manifestFile,
    message:
      "MANIFEST_CONTRACT_DRIFT: active contracts must be derived from DSH_CONTRACT_REGISTRY",
  });
}
if (!manifest.includes("contractOperations: DSH_CONTRACT_OPERATIONS")) {
  violations.push({
    file: manifestFile,
    message:
      "MANIFEST_OPERATION_DRIFT: currentTruth.contractOperations must be derived from merged capability ownership",
  });
}

function parseContractRegistry(source) {
  const blocks = source.match(/\{\s*id:\s*"[^"]+"[\s\S]*?\n\s*\}/g) ?? [];
  return blocks.map((block) => ({
    id: block.match(/id:\s*"([^"]+)"/)?.[1] ?? "",
    path: block.match(/path:\s*"([^"]+)"/)?.[1] ?? "",
    state: block.match(/state:\s*"([^"]+)"/)?.[1] ?? "",
    clientStrategy: block.match(/clientStrategy:\s*"([^"]+)"/)?.[1] ?? "",
    generatedClient: block.match(/generatedClient:\s*"([^"]+)"/)?.[1] ?? null,
    adapterOwner: block.match(/adapterOwner:\s*"([^"]+)"/)?.[1] ?? null,
  }));
}

const contractRegistry = parseContractRegistry(registrySource);
const contractIds = new Set();
const registeredContractPaths = new Set();

for (const contract of contractRegistry) {
  if (!contract.id || !contract.path || !contract.clientStrategy) {
    violations.push({
      file: contractRegistryFile,
      message: "MALFORMED_CONTRACT_REGISTRATION: id, path, and clientStrategy are required",
    });
    continue;
  }
  if (contractIds.has(contract.id)) {
    violations.push({
      file: contractRegistryFile,
      contractId: contract.id,
      message: `DUPLICATE_CONTRACT_ID: ${contract.id}`,
    });
  }
  contractIds.add(contract.id);

  const contractPath = toPosix(path.join(serviceRoot, contract.path));
  if (registeredContractPaths.has(contractPath)) {
    violations.push({
      file: contractRegistryFile,
      contractPath,
      message: `DUPLICATE_CONTRACT_PATH: ${contractPath}`,
    });
  }
  registeredContractPaths.add(contractPath);

  if (!fs.existsSync(path.join(repoRoot, contractPath))) {
    violations.push({
      file: contractRegistryFile,
      contractPath,
      message: `REGISTERED_CONTRACT_MISSING: ${contractPath}`,
    });
  }
  if (contract.state !== "CONTRACT_ACTIVE") {
    violations.push({
      file: contractRegistryFile,
      contractId: contract.id,
      message: `NON_CANONICAL_CONTRACT_STATE: ${contract.state}`,
    });
  }
}

const contractsDirectory = path.join(repoRoot, serviceRoot, "contracts");
for (const fileName of fs.readdirSync(contractsDirectory).filter((name) => name.endsWith(".openapi.yaml"))) {
  const relative = toPosix(path.join(serviceRoot, "contracts", fileName));
  const content = read(relative);
  if (/x-bthwani-contract-state:\s*CONTRACT_ACTIVE\b/.test(content) && !registeredContractPaths.has(relative)) {
    violations.push({
      file: relative,
      message: "ACTIVE_CONTRACT_NOT_REGISTERED",
    });
  }
}

const primaryContracts = contractRegistry.filter(
  (contract) => contract.clientStrategy === "PRIMARY_GENERATED",
);
if (primaryContracts.length !== 1) {
  violations.push({
    file: contractRegistryFile,
    message: `PRIMARY_CONTRACT_COUNT_INVALID: expected 1, found ${primaryContracts.length}`,
  });
}

const primary = primaryContracts[0];
const primaryPath = primary ? toPosix(path.join(serviceRoot, primary.path)) : null;
const primaryOperations = primaryPath
  ? parseOpenApiContract(primaryPath).map((operation) => operation.operationId).filter(Boolean).sort()
  : [];
const primaryOperationSet = new Set(primaryOperations);

for (const contract of contractRegistry) {
  const contractPath = toPosix(path.join(serviceRoot, contract.path));
  if (!fs.existsSync(path.join(repoRoot, contractPath))) continue;
  const contractSource = read(contractPath);
  const contractOperations = parseOpenApiContract(contractPath)
    .map((operation) => operation.operationId)
    .filter(Boolean)
    .sort();

  if (!/x-bthwani-contract-state:\s*CONTRACT_ACTIVE\b/.test(contractSource)) {
    violations.push({
      file: contractPath,
      message: "REGISTERED_ACTIVE_CONTRACT_METADATA_MISMATCH",
    });
  }

  if (contract.clientStrategy !== "PRIMARY_GENERATED") {
    for (const operationId of contractOperations) {
      if (!primaryOperationSet.has(operationId)) {
        violations.push({
          file: contractPath,
          operationId,
          message: `CONTRACT_SHARD_OPERATION_NOT_IN_PRIMARY: ${operationId}`,
        });
      }
    }
  }

  if (
    contract.clientStrategy === "PRIMARY_GENERATED" ||
    contract.clientStrategy === "SECONDARY_GENERATED_SUBSET" ||
    contract.clientStrategy === "PARENT_GENERATED_SUBSET"
  ) {
    if (!contract.generatedClient) {
      violations.push({
        file: contractRegistryFile,
        contractId: contract.id,
        message: "GENERATED_CLIENT_PATH_REQUIRED",
      });
      continue;
    }
    const generatedClientPath = toPosix(path.join(serviceRoot, contract.generatedClient));
    if (!fs.existsSync(path.join(repoRoot, generatedClientPath))) {
      violations.push({
        file: contractRegistryFile,
        contractId: contract.id,
        message: `GENERATED_CLIENT_MISSING: ${generatedClientPath}`,
      });
      continue;
    }
    const generatedClient = read(generatedClientPath);
    for (const operationId of contractOperations) {
      if (!generatedClient.includes(operationId)) {
        violations.push({
          file: generatedClientPath,
          operationId,
          message: `GENERATED_CLIENT_OPERATION_MISSING: ${operationId}`,
        });
      }
    }
  }

  if (contract.clientStrategy === "MANUAL_TYPED_ADAPTER") {
    if (!contract.adapterOwner) {
      violations.push({
        file: contractRegistryFile,
        contractId: contract.id,
        message: "MANUAL_ADAPTER_OWNER_REQUIRED",
      });
    }
    if (!/x-bthwani-client-generation:\s*DISABLED\b/.test(contractSource)) {
      violations.push({
        file: contractPath,
        message: "MANUAL_ADAPTER_REQUIRES_DISABLED_GENERATION_METADATA",
      });
    }
    if (!/x-bthwani-client-binding:\s*MANUAL_TYPED_ADAPTER\b/.test(contractSource)) {
      violations.push({
        file: contractPath,
        message: "MANUAL_ADAPTER_BINDING_METADATA_MISSING",
      });
    }
  }
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
      message: `ORPHAN_CAPABILITY_EXTENSION: "${extension.id}" has no canonical capability`,
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
  if (!operationsByCapability.has(capability.id)) operationsByCapability.set(capability.id, new Set());
  const ownedOperations = operationsByCapability.get(capability.id);
  for (const operationId of capability.operations) {
    if (ownedOperations.has(operationId)) {
      violations.push({
        file: capability.file,
        capabilityId: capability.id,
        operationId,
        message: `DUPLICATE_CAPABILITY_OPERATION: "${operationId}"`,
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
    if (!primaryOperationSet.has(operationId)) {
      violations.push({
        file: capabilityMapFiles.join(", "),
        capabilityId,
        operationId,
        message: `STALE_CAPABILITY_OPERATION: "${operationId}" is absent from the primary contract`,
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
      message: `DUPLICATE_OPERATION_OWNERSHIP: "${operationId}"`,
    });
  }
}

for (const operationId of primaryOperations) {
  if (!ownersByOperation.has(operationId)) {
    violations.push({
      file: capabilityMapFiles.join(", "),
      operationId,
      message: `UNOWNED_OPERATION: "${operationId}" has no canonical DSH capability owner`,
    });
  }
}

fail(guardId, violations);
