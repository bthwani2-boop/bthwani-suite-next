/**
 * api-binding-gate.mjs
 *
 * Verifies the OpenAPI-first binding chain:
 *   Master contract index → active contract → generated/shared client → API adapter.
 *
 * Side contracts that are not present in contracts/openapi/index.yaml are not
 * accepted as runtime truth. This prevents contract-only features from making
 * frontend adapters appear bound while no router, repository, or migration exists.
 *
 * The master indexes one entry contract per bounded context and never its
 * internals. Each entry indexes its own modules under `x-bthwani-contracts`, so
 * reachability is resolved transitively: master -> entry -> module, one level deep.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fail, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";
import { parseIndexedContractModules, parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "api-binding-gate";
const violations = [];
const masterContractPath = "contracts/openapi/index.yaml";

function loadMasterContractReferences() {
  const modules = parseIndexedContractModules(masterContractPath);
  const references = [];
  for (const module of modules) {
    if (!module.exists) {
      violations.push({
        file: masterContractPath,
        message: `MASTER_CONTRACT_REFERENCE_MISSING ${module.file}`,
      });
      continue;
    }
    references.push(module.file);
  }
  if (references.length === 0) {
    violations.push({ file: masterContractPath, message: "MASTER_CONTRACT_INDEX_EMPTY" });
  }
  return references;
}

// Expands each master-indexed entry contract with the modules it indexes itself.
// One level only: modules are leaves by definition.
function expandEntryModules(entryReferences) {
  const expanded = new Set(entryReferences);
  for (const entry of entryReferences) {
    for (const module of parseIndexedContractModules(entry)) {
      if (!module.exists) {
        violations.push({
          file: entry,
          message: `ENTRY_MODULE_REFERENCE_MISSING ${module.file}`,
        });
        continue;
      }
      expanded.add(module.file);
    }
  }
  return [...expanded];
}

const masterReferences = expandEntryModules(loadMasterContractReferences());
const contractOperations = masterReferences.flatMap((relative) => parseOpenApiContract(relative));
const knownPaths = new Set(contractOperations.map((operation) => operation.path));

function normalizePath(rawPath) {
  return rawPath
    .replace(/[?#].*$/, "")
    .replace(/\{[^}]+\}/g, "{param}")
    .replace(/`/g, "")
    .replace(/\/+$/, "");
}

function pathSegments(rawPath) {
  return normalizePath(rawPath).split("/").filter(Boolean);
}

function pathsAreCompatible(candidatePath, contractPath) {
  const candidate = pathSegments(candidatePath);
  const contract = pathSegments(contractPath);
  if (candidate.length !== contract.length) return false;

  return candidate.every((segment, index) => {
    const contractSegment = contract[index];
    return segment === contractSegment || segment === "{param}" || contractSegment === "{param}";
  });
}

function isKnownPath(rawPath) {
  for (const known of knownPaths) {
    if (pathsAreCompatible(rawPath, known)) return true;
  }
  return false;
}

function isKnownOperation(method, rawPath) {
  const normalizedMethod = String(method ?? "").toUpperCase();
  return contractOperations.some(
    (operation) =>
      operation.method === normalizedMethod &&
      pathsAreCompatible(rawPath, operation.path),
  );
}

function scriptKindFor(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function materializeTemplatePath(node) {
  let value = node.head.text;
  for (const span of node.templateSpans) {
    if (/[?#]/.test(value)) break;
    if (!value.endsWith("/")) {
      // Expressions appended to a complete route are query fragments or other
      // runtime suffixes, not path parameters. The contract path ends here.
      break;
    }
    value += `{param}${span.literal.text}`;
  }
  return value;
}

function staticPathValue(node) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return materializeTemplatePath(node);
  }
  return null;
}

function propertyNameText(name) {
  if (!name) return "";
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return "";
}

function callName(node) {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return "";
}

function staticMethodFromCall(node) {
  const name = callName(node).toLowerCase();
  if (["get", "post", "put", "patch", "delete", "options", "head"].includes(name)) {
    return name.toUpperCase();
  }

  const options = node.arguments[1];
  if (!options) return "GET";
  if (!ts.isObjectLiteralExpression(options)) return null;

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "method") continue;
    const initializer = property.initializer;
    if (ts.isStringLiteralLike(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
      return initializer.text.toUpperCase();
    }
    return null;
  }
  return "GET";
}

function extractApiPathLiterals(file, content) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKindFor(file));
  const paths = new Set();

  function record(value) {
    const normalized = value.replace(/[?#].*$/, "");
    if (/^\/(?:dsh|wlt|identity|providers)\//.test(normalized)) paths.add(normalized);
  }

  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      record(node.text);
    } else if (ts.isTemplateExpression(node)) {
      record(materializeTemplatePath(node));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return paths;
}

function extractApiOperationCalls(file, content) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKindFor(file));
  const operations = new Map();
  const approvedCallNames = new Set([
    "fetch",
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
  ]);

  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const name = callName(node).toLowerCase();
      if (approvedCallNames.has(name)) {
        const rawPath = staticPathValue(node.arguments[0]);
        if (rawPath && /^\/(?:dsh|wlt|identity|providers)\//.test(rawPath.replace(/[?#].*$/, ""))) {
          const method = staticMethodFromCall(node);
          const key = `${method ?? "DYNAMIC"} ${rawPath}`;
          operations.set(key, { method, path: rawPath });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...operations.values()];
}

const DSH_HTTP_CLIENT_PATTERN = /\bcreate(?:Dsh|DshPublic|DshFlexible|DshRaw)HttpClient\b/;
const RAW_FETCH_PATTERN = /\bfetch\s*\(/g;
const MOCK_RESOLVE_PATTERN = /\breturn\s+Promise\.resolve\s*\(\s*[\[{]/;
const HARDCODED_URL_PATTERN = /https?:\/\/(?!localhost|127\.0\.0\.1|\.\.\.|example\.com)/;

const apiFiles = listCodeFiles().filter((file) => {
  if (file.endsWith("-registry.ts")) return false;
  if (
    file.endsWith(".api.ts") ||
    file.endsWith(".client.ts") ||
    file.endsWith("api-client.ts") ||
    file.endsWith("runtime-adapter.ts")
  ) {
    return true;
  }
  const isSharedFile = /^services\/[^/]+\/frontend\/shared\//.test(file);
  if (isSharedFile) {
    try {
      const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
      return content.includes("/dsh/") || content.includes("/wlt/") || content.includes("/identity/");
    } catch {
      return false;
    }
  }
  return false;
});

for (const file of apiFiles) {
  const content = read(file);
  const isDshAdapter = file.includes("services/dsh/") || file.includes("finance-wlt-link");
  const isWltAdapter = file.includes("services/wlt/");

  if (MOCK_RESOLVE_PATTERN.test(content)) {
    violations.push({
      file,
      message: "FORBIDDEN: Promise.resolve() with hardcoded data in adapter — mock/fallback success path not allowed",
    });
  }

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
    if (HARDCODED_URL_PATTERN.test(line)) {
      violations.push({
        file,
        line: index + 1,
        message: `FORBIDDEN: hardcoded runtime URL in adapter: "${line.trim()}"`,
      });
    }
  }

  const usesApprovedClient = DSH_HTTP_CLIENT_PATTERN.test(content);
  const isMultipartUploadAdapter = content.includes("new FormData(");
  if (!usesApprovedClient && !isMultipartUploadAdapter) {
    const fetchMatches = [...content.matchAll(RAW_FETCH_PATTERN)];
    if (fetchMatches.length > 0) {
      violations.push({
        file,
        message: "FORBIDDEN: raw fetch() in adapter without approved HTTP client (createDsh*HttpClient)",
      });
    }
  }

  if (isDshAdapter || isWltAdapter) {
    for (const rawPath of extractApiPathLiterals(file, content)) {
      if (!isKnownPath(rawPath)) {
        violations.push({
          file,
          message: `UNREGISTERED PATH: "${rawPath}" not found in master-indexed OpenAPI contracts`,
        });
      }
    }

    for (const operation of extractApiOperationCalls(file, content)) {
      if (!operation.method) continue;
      if (!isKnownOperation(operation.method, operation.path)) {
        violations.push({
          file,
          message: `UNREGISTERED OPERATION: "${operation.method} ${operation.path}" not found in master-indexed OpenAPI contracts`,
        });
      }
    }
  }
}

fail(guardId, violations);
