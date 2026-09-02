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

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativeToRepository(filePath) {
  return toPosix(path.relative(repositoryRoot, filePath));
}

export function generatedClientEntries() {
  return Object.entries(contextManifests).flatMap(([context, manifestRelativePath]) => {
    const manifestPath = path.join(repositoryRoot, manifestRelativePath);
    const contractsDirectory = path.dirname(manifestPath);
    const manifest = parse(fs.readFileSync(manifestPath, "utf8"));

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
