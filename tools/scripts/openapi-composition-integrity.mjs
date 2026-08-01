import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptsDirectory, "../..");
const MEMORY_DOCUMENT_KEY = "<memory>";
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const FILE_URI_PATTERN = /^file:/i;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

function escapeJsonPointerToken(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function decodeJsonPointerToken(value) {
  return decodeURIComponent(value).replaceAll("~1", "/").replaceAll("~0", "~");
}

function isLocalReference(value) {
  if (typeof value !== "string") return false;
  if (value.startsWith("#")) return true;
  if (FILE_URI_PATTERN.test(value)) return true;
  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(value)) return true;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/") || value.startsWith("\\")) return true;
  return !URI_SCHEME_PATTERN.test(value);
}

function isWithinRepository(repositoryRoot, targetFile) {
  const relativePath = path.relative(repositoryRoot, targetFile);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath))
  );
}

function displayDocumentPath(filePath, repositoryRoot) {
  return filePath ? path.relative(repositoryRoot, filePath) : MEMORY_DOCUMENT_KEY;
}

function readOpenApiDocument(filePath, documentCache) {
  const cached = documentCache.get(filePath);
  if (cached !== undefined) return cached;

  const document = parse(fs.readFileSync(filePath, "utf8"));
  documentCache.set(filePath, document);
  return document;
}

function resolveLocalReference(reference, sourceFile, repositoryRoot, documentCache) {
  const hashIndex = reference.indexOf("#");
  const filePart = hashIndex === -1 ? reference : reference.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : reference.slice(hashIndex + 1);

  if (FILE_URI_PATTERN.test(filePart)) {
    throw new Error("file URI references are not portable");
  }
  if (
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(filePart) ||
    filePart.startsWith("/") ||
    filePart.startsWith("\\")
  ) {
    throw new Error("absolute filesystem references are not portable");
  }

  let targetFile = sourceFile;
  let targetDocument;
  if (filePart === "") {
    targetDocument = documentCache.get(sourceFile ?? MEMORY_DOCUMENT_KEY);
    if (targetDocument === undefined) {
      throw new Error("source OpenAPI document is unavailable for internal reference resolution");
    }
  } else {
    if (!sourceFile) {
      throw new Error("bundlePath is required to validate external local references");
    }
    targetFile = path.resolve(path.dirname(sourceFile), filePart);
    if (!isWithinRepository(repositoryRoot, targetFile)) {
      throw new Error("reference escapes the repository boundary");
    }
    if (!fs.existsSync(targetFile)) {
      throw new Error(`target file does not exist: ${path.relative(repositoryRoot, targetFile)}`);
    }
    if (!fs.statSync(targetFile).isFile()) {
      throw new Error(`target is not a file: ${path.relative(repositoryRoot, targetFile)}`);
    }

    try {
      targetDocument = readOpenApiDocument(targetFile, documentCache);
    } catch (error) {
      throw new Error(
        `target file is not valid YAML: ${path.relative(repositoryRoot, targetFile)} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  if (fragment === "") {
    return { targetFile, targetValue: targetDocument };
  }
  if (!fragment.startsWith("/")) {
    throw new Error(`unsupported URI fragment #${fragment}; expected a JSON Pointer`);
  }

  let targetValue = targetDocument;
  for (const rawToken of fragment.slice(1).split("/")) {
    let token;
    try {
      token = decodeJsonPointerToken(rawToken);
    } catch (error) {
      throw new Error(
        `invalid percent-encoding in JSON Pointer token ${rawToken} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (!targetValue || typeof targetValue !== "object" || !Object.hasOwn(targetValue, token)) {
      throw new Error(
        `JSON Pointer #${fragment} does not exist in ${displayDocumentPath(targetFile, repositoryRoot)}`,
      );
    }
    targetValue = targetValue[token];
  }

  return { targetFile, targetValue };
}

function collectUnresolvedLocalReferences(
  value,
  sourceFile,
  location,
  state,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnresolvedLocalReferences(item, sourceFile, `${location}/${index}`, state));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (state.visitedObjects.has(value)) return;
  state.visitedObjects.add(value);

  for (const [key, item] of Object.entries(value)) {
    const itemLocation = `${location}/${escapeJsonPointerToken(key)}`;
    if (key === "$ref" && isLocalReference(item)) {
      const referenceKey = `${sourceFile ?? MEMORY_DOCUMENT_KEY}::${item}`;
      try {
        const { targetFile, targetValue } = resolveLocalReference(
          item,
          sourceFile,
          state.repositoryRoot,
          state.documentCache,
        );
        if (!state.validatedReferences.has(referenceKey)) {
          state.validatedReferences.add(referenceKey);
          collectUnresolvedLocalReferences(
            targetValue,
            targetFile,
            `${itemLocation}(${item})`,
            state,
          );
        }
      } catch (error) {
        state.findings.push({
          location: itemLocation,
          reference: item,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    collectUnresolvedLocalReferences(item, sourceFile, itemLocation, state);
  }
}

export function findUnresolvedLocalOpenApiReferences(
  bundle,
  { bundlePath = MEMORY_DOCUMENT_KEY, repositoryRoot = defaultRepositoryRoot } = {},
) {
  const document = typeof bundle === "string" ? parse(bundle) : bundle;
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Composed OpenAPI bundle must be an object.");
  }

  const absoluteRepositoryRoot = path.resolve(repositoryRoot);
  const sourceFile = bundlePath === MEMORY_DOCUMENT_KEY
    ? null
    : path.resolve(absoluteRepositoryRoot, bundlePath);
  const findings = [];
  const documentCache = new Map();
  documentCache.set(sourceFile ?? MEMORY_DOCUMENT_KEY, document);

  collectUnresolvedLocalReferences(document, sourceFile, "#", {
    documentCache,
    findings,
    repositoryRoot: absoluteRepositoryRoot,
    validatedReferences: new Set(),
    visitedObjects: new Set(),
  });
  return findings;
}

export function assertNoUnresolvedLocalOpenApiReferences(
  bundle,
  { context = "unknown", bundlePath = MEMORY_DOCUMENT_KEY, repositoryRoot = defaultRepositoryRoot } = {},
) {
  const findings = findUnresolvedLocalOpenApiReferences(bundle, { bundlePath, repositoryRoot });
  if (findings.length === 0) return;

  const displayed = findings
    .slice(0, 20)
    .map(({ location, reference, reason }) => `${location} -> ${reference} (${reason})`)
    .join("; ");
  const omitted = findings.length > 20 ? `; ${findings.length - 20} more` : "";
  throw new Error(
    `${context}: composed bundle ${bundlePath} retains unresolved local OpenAPI references: ${displayed}${omitted}`,
  );
}

export function materializeVerifiedOpenApiBundle(result, repositoryRoot) {
  assertNoUnresolvedLocalOpenApiReferences(result.bundle, { ...result, repositoryRoot });
  const bundleFile = path.join(repositoryRoot, result.bundlePath);
  const content = result.bundle.endsWith("\n") ? result.bundle : `${result.bundle}\n`;
  fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
  fs.writeFileSync(bundleFile, content, "utf8");
}
