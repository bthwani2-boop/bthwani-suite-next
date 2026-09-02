import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { contextManifests, repositoryRoot } from "./openapi-context-composer.mjs";

const requiredFields = [
  "context",
  "owner",
  "contractState",
  "bundle",
  "client",
  "regenerateScript",
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativeToRepository(filePath) {
  return toPosix(path.relative(repositoryRoot, filePath));
}

export function generatedClientEntries() {
  return Object.entries(contextManifests).map(([context, manifestRelativePath]) => {
    const manifestPath = path.join(repositoryRoot, manifestRelativePath);
    const contractsDirectory = path.dirname(manifestPath);
    const manifest = parse(fs.readFileSync(manifestPath, "utf8"));

    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error(`${manifestRelativePath} must contain an object manifest.`);
    }
    for (const field of requiredFields) {
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

    const clientPath = path.resolve(contractsDirectory, manifest.client);
    const contractPath = path.resolve(contractsDirectory, manifest.bundle);

    return Object.freeze({
      context,
      owner: manifest.owner,
      manifest: manifestRelativePath,
      client: relativeToRepository(clientPath),
      contract: relativeToRepository(contractPath),
      regenerateScript: manifest.regenerateScript,
      mode: "OPENAPI_TYPESCRIPT",
      generatedRoot: relativeToRepository(path.dirname(clientPath)),
    });
  });
}
