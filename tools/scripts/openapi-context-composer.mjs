import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptsDirectory, "../..");

export const contextManifests = Object.freeze({
  identity: "core/identity/contracts/contract.manifest.yaml",
  workforce: "core/workforce/contracts/contract.manifest.yaml",
  "platform-control": "core/platform-control/contracts/contract.manifest.yaml",
  providers: "core/providers/contracts/contract.manifest.yaml",
  dsh: "services/dsh/contracts/contract.manifest.yaml",
  wlt: "services/wlt/contracts/contract.manifest.yaml",
});

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

function relative(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function isDeepSubset(candidate, ownerValue) {
  if (Array.isArray(candidate)) {
    return Array.isArray(ownerValue) && isDeepStrictEqual(candidate, ownerValue);
  }
  if (!candidate || typeof candidate !== "object") {
    return isDeepStrictEqual(candidate, ownerValue);
  }
  if (!ownerValue || typeof ownerValue !== "object" || Array.isArray(ownerValue)) {
    return false;
  }
  return Object.entries(candidate).every(
    ([key, value]) => Object.hasOwn(ownerValue, key) && isDeepSubset(value, ownerValue[key]),
  );
}

function semanticShape(value) {
  if (Array.isArray(value)) return value.map(semanticShape);
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (["description", "summary", "example", "examples", "externalDocs"].includes(key)) {
      continue;
    }
    output[key] = semanticShape(item);
  }
  return output;
}

function valuesCompatible(owned, candidate) {
  return (
    isDeepStrictEqual(owned, candidate) ||
    isDeepSubset(candidate, owned) ||
    isDeepSubset(owned, candidate) ||
    isDeepSubset(semanticShape(candidate), semanticShape(owned)) ||
    isDeepSubset(semanticShape(owned), semanticShape(candidate))
  );
}

function moduleNamespace(sourceFile) {
  return path.basename(sourceFile)
    .replace(/\.openapi\.yaml$/i, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
}

function rewriteLocalComponentRefs(value, replacements) {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteLocalComponentRefs(item, replacements));
  }
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "$ref" && typeof item === "string" && replacements.has(item)) {
      output[key] = replacements.get(item);
    } else {
      output[key] = rewriteLocalComponentRefs(item, replacements);
    }
  }
  return output;
}

function namespaceConflictingComponents(document, existingComponents, sourceFile) {
  const output = clone(document);
  const replacements = new Map();
  const namespace = moduleNamespace(sourceFile);

  for (const [sectionName, entries] of Object.entries(output.components ?? {})) {
    for (const [key, value] of Object.entries(entries ?? {})) {
      const owned = existingComponents?.[sectionName]?.[key];
      if (owned === undefined || valuesCompatible(owned, value)) continue;

      let candidate = `${namespace}${key}`;
      let suffix = 2;
      while (
        Object.hasOwn(existingComponents?.[sectionName] ?? {}, candidate) ||
        Object.hasOwn(entries, candidate)
      ) {
        candidate = `${namespace}${key}${suffix}`;
        suffix += 1;
      }

      entries[candidate] = value;
      delete entries[key];
      replacements.set(
        `#/components/${sectionName}/${key}`,
        `#/components/${sectionName}/${candidate}`,
      );
    }
  }

  return rewriteLocalComponentRefs(output, replacements);
}

function mergeUniqueMap(target, source, label, sourcePath, options = {}) {
  for (const [key, value] of Object.entries(source ?? {})) {
    const ownerKey = `${label}:${key}`;
    if (Object.hasOwn(target, key)) {
      if (
        isDeepStrictEqual(target[key], value) ||
        isDeepSubset(value, target[key]) ||
        isDeepSubset(semanticShape(value), semanticShape(target[key])) ||
        isDeepStrictEqual(semanticShape(target[key]), semanticShape(value))
      ) {
        continue;
      }

      if (
        isDeepSubset(target[key], value) ||
        isDeepSubset(semanticShape(target[key]), semanticShape(value))
      ) {
        target[key] = clone(value);
        options.owners?.set(ownerKey, options.sourceIndex);
        continue;
      }

      if (options.allowEntryOverride && options.owners?.get(ownerKey) === 0) {
        target[key] = clone(value);
        options.owners.set(ownerKey, options.sourceIndex);
        continue;
      }

      throw new Error(`${label} ${key} is duplicated by ${sourcePath}.`);
    }

    target[key] = clone(value);
    options.owners?.set(ownerKey, options.sourceIndex);
  }
}

function mergePathMap(target, source, sourcePath, options = {}) {
  for (const [pathKey, pathItem] of Object.entries(source ?? {})) {
    if (!Object.hasOwn(target, pathKey)) {
      target[pathKey] = clone(pathItem);
      for (const member of Object.keys(pathItem ?? {})) {
        options.owners?.set(`${pathKey}:${member}`, options.sourceIndex);
      }
      continue;
    }

    for (const [member, value] of Object.entries(pathItem ?? {})) {
      const ownerKey = `${pathKey}:${member}`;
      if (Object.hasOwn(target[pathKey], member)) {
        const owned = target[pathKey][member];
        if (
          isDeepStrictEqual(owned, value) ||
          isDeepSubset(value, owned) ||
          isDeepSubset(semanticShape(value), semanticShape(owned))
        ) {
          continue;
        }

        if (
          isDeepSubset(owned, value) ||
          isDeepSubset(semanticShape(owned), semanticShape(value))
        ) {
          target[pathKey][member] = clone(value);
          options.owners?.set(ownerKey, options.sourceIndex);
          continue;
        }

        if (
          options.allowEntryOverride &&
          options.owners?.get(ownerKey) === 0 &&
          (
            member === "parameters" ||
            (owned?.operationId && owned.operationId === value?.operationId)
          )
        ) {
          target[pathKey][member] = clone(value);
          options.owners.set(ownerKey, options.sourceIndex);
          continue;
        }

        if (owned?.operationId && owned.operationId === value?.operationId) {
          continue;
        }

        throw new Error(
          `path member ${member.toUpperCase()} ${pathKey} is duplicated by ${sourcePath}.`,
        );
      }

      target[pathKey][member] = clone(value);
      options.owners?.set(ownerKey, options.sourceIndex);
    }
  }
}

function collectOperationIds(document) {
  const owners = new Map();
  for (const [pathKey, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!["get", "put", "post", "delete", "options", "head", "patch", "trace"].includes(method)) {
        continue;
      }

      const operationId = operation?.operationId;
      if (!operationId) continue;

      const previous = owners.get(operationId);
      if (previous) {
        throw new Error(
          `operationId ${operationId} is duplicated by ${previous} and ${method.toUpperCase()} ${pathKey}.`,
        );
      }
      owners.set(operationId, `${method.toUpperCase()} ${pathKey}`);
    }
  }
  return [...owners.keys()].sort();
}

function deepMerge(target, update) {
  if (Array.isArray(update) || !update || typeof update !== "object") {
    return clone(update);
  }

  const result = target && typeof target === "object" && !Array.isArray(target)
    ? clone(target)
    : {};
  for (const [key, value] of Object.entries(update)) {
    result[key] = deepMerge(result[key], value);
  }
  return result;
}

function parseOverlayTarget(target) {
  if (typeof target !== "string" || !target.startsWith("$")) {
    throw new Error(`Unsupported overlay target ${String(target)}.`);
  }

  const tokens = [];
  const pattern = /\.([A-Za-z0-9_-]+)|\[['"]([^'"]+)['"]\]/g;
  for (const match of target.slice(1).matchAll(pattern)) {
    tokens.push(match[1] ?? match[2]);
  }

  if (tokens.length === 0) {
    throw new Error(`Overlay target ${target} did not resolve to a document location.`);
  }
  return tokens;
}

function applyOverlay(document, overlay, overlayPath) {
  if (overlay?.overlay !== "1.0.0" || !Array.isArray(overlay.actions)) {
    throw new Error(`${overlayPath} is not an Overlay 1.0.0 document.`);
  }

  const output = clone(document);
  for (const action of overlay.actions) {
    const tokens = parseOverlayTarget(action.target);
    let parent = output;

    for (const token of tokens.slice(0, -1)) {
      if (!Object.hasOwn(parent, token)) {
        throw new Error(`${overlayPath} target ${action.target} is missing ${token}.`);
      }
      parent = parent[token];
    }

    const key = tokens.at(-1);
    if (!Object.hasOwn(parent, key)) {
      throw new Error(`${overlayPath} target ${action.target} does not exist.`);
    }

    if (action.remove === true) {
      delete parent[key];
    } else if (Object.hasOwn(action, "update")) {
      parent[key] = deepMerge(parent[key], action.update);
    } else {
      throw new Error(`${overlayPath} action ${action.target} has neither update nor remove.`);
    }
  }

  return output;
}

function resolveModularFragments(document, rootSourceFile) {
  const output = clone(document);
  const docCache = new Map();
  const isAbsoluteReference = (value) =>
    /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//");

  const resolve = (value, currentSourceFile) => {
    if (Array.isArray(value)) {
      return value.map((item) => resolve(item, currentSourceFile));
    }
    if (!value || typeof value !== "object") return value;

    const resolvedObject = {};
    for (const [key, item] of Object.entries(value)) {
      // A fragment fetched from a non-root module file carries its own
      // same-document ("#/...") refs. Those must resolve against the module
      // file it came from, not the final merged document, so they are
      // rewritten to an explicit cross-file ref back into that module before
      // the ordinary cross-file resolution below runs.
      const isBareSameDocumentRef =
        key === "$ref" && typeof item === "string" && item.startsWith("#");
      const rewrittenItem =
        isBareSameDocumentRef && currentSourceFile !== rootSourceFile
          ? `${path.basename(currentSourceFile)}${item}`
          : item;

      if (
        key === "$ref" &&
        typeof rewrittenItem === "string" &&
        !rewrittenItem.startsWith("#") &&
        !isAbsoluteReference(rewrittenItem)
      ) {
        const hashIndex = rewrittenItem.indexOf("#");
        if (hashIndex !== -1) {
          const filePart = rewrittenItem.slice(0, hashIndex);
          const fragment = rewrittenItem.slice(hashIndex + 2);
          const targetFile = path.resolve(path.dirname(currentSourceFile), filePart);

          if (fs.existsSync(targetFile)) {
            let targetDocument = docCache.get(targetFile);
            if (!targetDocument) {
              targetDocument = parse(readText(targetFile));
              docCache.set(targetFile, targetDocument);
            }

            const tokens = fragment.split("/");
            let fragmentValue = targetDocument;
            for (const token of tokens) {
              const decoded = token.replace(/~1/g, "/").replace(/~0/g, "~");
              if (fragmentValue && Object.hasOwn(fragmentValue, decoded)) {
                fragmentValue = fragmentValue[decoded];
              } else {
                fragmentValue = null;
                break;
              }
            }

            if (fragmentValue) {
              return resolve(fragmentValue, targetFile);
            }
          }
        }
      }

      resolvedObject[key] = resolve(item, currentSourceFile);
    }
    return resolvedObject;
  };

  if (output.paths) {
    for (const [pathKey, pathItem] of Object.entries(output.paths)) {
      output.paths[pathKey] = resolve(pathItem, rootSourceFile);
    }
  }

  if (output.components) {
    for (const [section, entries] of Object.entries(output.components)) {
      for (const [componentKey, component] of Object.entries(entries)) {
        output.components[section][componentKey] = resolve(component, rootSourceFile);
      }
    }
  }

  return output;
}

function rewriteExternalRefs(value, sourceFile, bundledSourceFiles, bundleFile) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      rewriteExternalRefs(item, sourceFile, bundledSourceFiles, bundleFile));
  }
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      key === "$ref" &&
      typeof item === "string" &&
      !item.startsWith("#") &&
      !/^[a-z][a-z0-9+.-]*:/i.test(item)
    ) {
      const hashIndex = item.indexOf("#");
      const filePart = hashIndex === -1 ? item : item.slice(0, hashIndex);
      const fragment = hashIndex === -1 ? "" : item.slice(hashIndex);
      const target = path.resolve(path.dirname(sourceFile), filePart);
      output[key] = bundledSourceFiles.has(path.resolve(target))
        ? fragment || "#"
        : `${path.relative(path.dirname(bundleFile), target).split(path.sep).join("/")}${fragment}`;
    } else {
      output[key] = rewriteExternalRefs(item, sourceFile, bundledSourceFiles, bundleFile);
    }
  }
  return output;
}

function mergeDocuments(
  entryDocument,
  sourceDocuments,
  sourceFiles,
  bundleFile,
  { allowEntryOverride = false } = {},
) {
  const output = clone(entryDocument);
  delete output["x-bthwani-contracts"];
  delete output["x-bthwani-overlays"];
  output.paths = {};
  output.components = {};

  const bundledSourceFiles = new Set(sourceFiles.map((filePath) => path.resolve(filePath)));
  const pathOwners = new Map();
  const componentOwners = new Map();
  const modular = entryDocument["x-bthwani-contract-layout"] === "MODULAR";

  for (let index = 0; index < sourceDocuments.length; index += 1) {
    const sourcePath = sourceFiles[index];
    const namespaced = index === 0
      ? sourceDocuments[index]
      : namespaceConflictingComponents(sourceDocuments[index], output.components, sourcePath);
    const document = index === 0 && modular
      ? resolveModularFragments(namespaced, sourcePath)
      : namespaced;

    // A MODULAR entry explicitly selects its path and component fragments by
    // reference. Satellite documents remain ownership inputs, not an implicit
    // second merge surface.
    if (modular && index > 0) continue;

    const rewritten = rewriteExternalRefs(
      document,
      sourcePath,
      bundledSourceFiles,
      bundleFile,
    );
    mergePathMap(output.paths, rewritten.paths, relative(sourcePath), {
      allowEntryOverride,
      owners: pathOwners,
      sourceIndex: index,
    });

    for (const [sectionName, entries] of Object.entries(rewritten.components ?? {})) {
      output.components[sectionName] ??= {};
      mergeUniqueMap(
        output.components[sectionName],
        entries,
        `components.${sectionName}`,
        relative(sourcePath),
        {
          allowEntryOverride,
          owners: componentOwners,
          sourceIndex: index,
        },
      );
    }
  }

  return output;
}

export async function composeContext(contextName, { write = true } = {}) {
  const manifestRelativePath = contextManifests[contextName];
  if (!manifestRelativePath) {
    throw new Error(`Unknown OpenAPI context ${contextName}.`);
  }

  const manifestPath = path.join(repositoryRoot, manifestRelativePath);
  const contractsDirectory = path.dirname(manifestPath);
  const manifest = parse(readText(manifestPath));
  assertObject(manifest, manifestRelativePath);

  if (!manifest.bundle) {
    throw new Error(`${manifestRelativePath} must declare bundle.`);
  }

  const entryFile = path.resolve(contractsDirectory, manifest.entry);
  const moduleFiles = (manifest.modules ?? []).map((item) =>
    path.resolve(contractsDirectory, item));
  const overlayFiles = (manifest.overlays ?? []).map((item) =>
    path.resolve(contractsDirectory, item));
  const sourceFiles = [entryFile, ...moduleFiles];
  const bundleFile = path.resolve(contractsDirectory, manifest.bundle);

  for (const filePath of [...sourceFiles, ...overlayFiles]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing OpenAPI source ${relative(filePath)}.`);
    }
  }

  const documents = sourceFiles.map((filePath) => parse(readText(filePath)));
  documents.forEach((document, index) =>
    assertObject(document, relative(sourceFiles[index])));

  let document = mergeDocuments(
    documents[0],
    documents,
    sourceFiles,
    bundleFile,
  );
  for (const overlayFile of overlayFiles) {
    document = applyOverlay(document, parse(readText(overlayFile)), relative(overlayFile));
  }

  document.openapi = "3.1.0";
  document["x-bthwani-contract-layout"] = "COMPOSED_BUNDLE";
  document["x-bthwani-source-files"] = [...sourceFiles, ...overlayFiles].map(relative);

  const sourceDigest = crypto
    .createHash("sha256")
    .update(
      [...sourceFiles, ...overlayFiles]
        .map((filePath) => `${relative(filePath)}\n${readText(filePath)}`)
        .join("\n"),
    )
    .digest("hex");
  document["x-bthwani-source-sha256"] = sourceDigest;

  const operationIds = collectOperationIds(document);
  const serialized = stringify(document, { lineWidth: 0 });
  const bundle = `# AUTO-GENERATED by tools/scripts/compose-openapi-context.mjs. DO NOT EDIT.\n${serialized}`;

  if (write) {
    fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
    fs.writeFileSync(bundleFile, bundle.endsWith("\n") ? bundle : `${bundle}\n`, "utf8");
  }

  return {
    context: contextName,
    bundle,
    bundlePath: relative(bundleFile),
    sourceDigest,
    pathCount: Object.keys(document.paths ?? {}).length,
    operationIds,
  };
}

export async function composeAllContexts({ write = true } = {}) {
  const results = [];
  for (const contextName of Object.keys(contextManifests)) {
    results.push(await composeContext(contextName, { write }));
  }
  return results;
}
