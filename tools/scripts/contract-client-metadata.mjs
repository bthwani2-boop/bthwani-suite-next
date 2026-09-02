import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { contextManifests, repositoryRoot } from "./openapi-context-composer.mjs";

const requiredManifestFields = [
  "context",
  "owner",
  "contractState",
  "bundle",
];

const generatedClientStrategies = new Set([
  "PRIMARY_GENERATED",
  "SECONDARY_GENERATED_SUBSET",
  "PARENT_GENERATED_SUBSET",
  "STANDALONE_GENERATED",
]);
const manualClientStrategies = new Set([
  "MANUAL_TYPED_ADAPTER",
  "STANDALONE_MANUAL_TYPED_ADAPTER",
]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativeToRepository(filePath) {
  return toPosix(path.relative(repositoryRoot, filePath));
}

function loadContextManifest(contextName) {
  const manifestRelativePath = contextManifests[contextName];
  if (!manifestRelativePath) throw new Error(`Unknown OpenAPI context ${contextName}.`);
  const manifestPath = path.join(repositoryRoot, manifestRelativePath);
  const contractsDirectory = path.dirname(manifestPath);
  const manifest = parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${manifestRelativePath} must contain an object manifest.`);
  }
  return { manifestRelativePath, manifest, contractsDirectory };
}

export function dshContractRegistrations() {
  const { manifestRelativePath, manifest, contractsDirectory } = loadContextManifest("dsh");
  const contracts = [manifest.entry, ...(manifest.modules ?? [])];
  const metadata = manifest.clientMetadata;
  if (!Array.isArray(metadata) || metadata.length !== contracts.length) {
    throw new Error(`${manifestRelativePath} clientMetadata must cover entry and every module exactly once.`);
  }

  const contractFiles = new Set(contracts.map((contract) => {
    if (typeof contract !== "string" || contract.trim() === "") {
      throw new Error(`${manifestRelativePath} contract paths must be non-empty strings.`);
    }
    return relativeToRepository(path.resolve(contractsDirectory, contract));
  }));
  const seenIds = new Set();
  const seenContracts = new Set();
  const registrations = metadata.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${manifestRelativePath} clientMetadata[${index}] must be an object.`);
    }
    for (const field of ["id", "contract", "clientStrategy"]) {
      if (typeof item[field] !== "string" || item[field].trim() === "") {
        throw new Error(`${manifestRelativePath} clientMetadata[${index}] must declare ${field}.`);
      }
    }
    const file = relativeToRepository(path.resolve(contractsDirectory, item.contract));
    if (!contractFiles.has(file)) throw new Error(`${manifestRelativePath} clientMetadata references unlisted contract ${item.contract}.`);
    if (seenIds.has(item.id)) throw new Error(`${manifestRelativePath} duplicates client metadata id ${item.id}.`);
    if (seenContracts.has(file)) throw new Error(`${manifestRelativePath} duplicates client metadata contract ${item.contract}.`);
    seenIds.add(item.id);
    seenContracts.add(file);
    if (!generatedClientStrategies.has(item.clientStrategy) && !manualClientStrategies.has(item.clientStrategy)) {
      throw new Error(`${manifestRelativePath} uses unsupported client strategy ${item.clientStrategy}.`);
    }
    if (generatedClientStrategies.has(item.clientStrategy) && typeof item.generatedClient !== "string") {
      throw new Error(`${manifestRelativePath} generated client metadata ${item.id} must declare generatedClient.`);
    }
    if (manualClientStrategies.has(item.clientStrategy) && typeof item.adapterOwner !== "string") {
      throw new Error(`${manifestRelativePath} manual client metadata ${item.id} must declare adapterOwner.`);
    }
    return {
      id: item.id,
      file,
      strategy: item.clientStrategy,
      generatedClient: item.generatedClient
        ? relativeToRepository(path.resolve(contractsDirectory, item.generatedClient))
        : null,
      adapterOwner: item.adapterOwner
        ? relativeToRepository(path.resolve(contractsDirectory, item.adapterOwner))
        : null,
    };
  });
  if (seenContracts.size !== contractFiles.size) {
    throw new Error(`${manifestRelativePath} clientMetadata does not cover every entry/module contract.`);
  }
  return registrations;
}

export function generatedClientEntries() {
  return Object.entries(contextManifests).flatMap(([context, manifestRelativePath]) => {
    const { manifest, contractsDirectory } = loadContextManifest(context);

    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error(`${manifestRelativePath} must contain an object manifest.`);
    }
    for (const field of requiredManifestFields) {
      if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
        throw new Error(`${manifestRelativePath} must declare ${field}.`);
      }
    }
    if (manifest.context !== manifest.owner) {
      throw new Error(`${manifestRelativePath} context and owner must match.`);
    }
    if (manifest.contractState !== "CONTRACT_ACTIVE") {
      throw new Error(`${manifestRelativePath} must remain CONTRACT_ACTIVE for generated-client materialization.`);
    }

    const contractPath = path.resolve(contractsDirectory, manifest.bundle);

    const targets = Array.isArray(manifest.generatedClients)
      ? manifest.generatedClients
      : [{
          mode: "OPENAPI_TYPESCRIPT",
          client: manifest.client,
          regenerateScript: manifest.regenerateScript,
        }];
    if (targets.length === 0) throw new Error(`${manifestRelativePath} must declare at least one generatedClients target.`);

    return targets.map((target, index) => {
      if (!target || typeof target !== "object" || Array.isArray(target)) {
        throw new Error(`${manifestRelativePath} generatedClients[${index}] must be an object.`);
      }
      for (const field of ["mode", "client", "regenerateScript"]) {
        if (typeof target[field] !== "string" || target[field].trim() === "") {
          throw new Error(`${manifestRelativePath} generatedClients[${index}] must declare ${field}.`);
        }
      }
      const clientPath = path.resolve(contractsDirectory, target.client);
      const generatedRoot = target.generatedRoot
        ? path.resolve(contractsDirectory, target.generatedRoot)
        : path.dirname(clientPath);
      return Object.freeze({
        context,
        owner: manifest.owner,
        manifest: manifestRelativePath,
        client: relativeToRepository(clientPath),
        contract: relativeToRepository(contractPath),
        regenerateScript: target.regenerateScript,
        mode: target.mode,
        generatedRoot: relativeToRepository(generatedRoot),
        scanRoot: target.scanRoot !== false,
      });
    });
  });
}
