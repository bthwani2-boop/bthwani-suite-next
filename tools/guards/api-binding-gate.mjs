/**
 * api-binding-gate.mjs
 *
 * Verifies the OpenAPI-first binding chain:
 *   Master contract index → active contract → generated/shared client → API adapter.
 *
 * Side contracts that are not present in contracts/master.openapi.yaml are not
 * accepted as runtime truth. This prevents contract-only features from making
 * frontend adapters appear bound while no router, repository, or migration exists.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fail, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "api-binding-gate";
const violations = [];
const masterContractPath = "contracts/master.openapi.yaml";

function loadMasterContractReferences() {
  const master = read(masterContractPath);
  const references = [];
  for (const line of master.split(/\r?\n/)) {
    const match = line.match(/^\s+[A-Za-z0-9_-]+:\s+(\.\.\/[^\s]+\.openapi\.yaml)\s*$/);
    if (!match) continue;
    const absolute = path.resolve(repoRoot, "contracts", match[1]);
    const relative = toPosix(path.relative(repoRoot, absolute));
    if (!fs.existsSync(absolute)) {
      violations.push({
        file: masterContractPath,
        message: `MASTER_CONTRACT_REFERENCE_MISSING ${relative}`,
      });
      continue;
    }
    references.push(relative);
  }
  if (references.length === 0) {
    violations.push({ file: masterContractPath, message: "MASTER_CONTRACT_INDEX_EMPTY" });
  }
  return references;
}

const masterReferences = loadMasterContractReferences();
const knownPaths = new Set(
  masterReferences.flatMap((relative) => parseOpenApiContract(relative).map((operation) => operation.path)),
);

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

const DSH_HTTP_CLIENT_PATTERN = /\bcreate(?:Dsh|DshPublic|DshFlexible|DshRaw)HttpClient\b/;
const WLT_HTTP_CLIENT_PATTERN = /\bwltFetchJson\b/;
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

  const usesApprovedClient =
    DSH_HTTP_CLIENT_PATTERN.test(content) || WLT_HTTP_CLIENT_PATTERN.test(content);
  const isMultipartUploadAdapter = content.includes("new FormData(");
  if (!usesApprovedClient && !isMultipartUploadAdapter) {
    const fetchMatches = [...content.matchAll(RAW_FETCH_PATTERN)];
    if (fetchMatches.length > 0) {
      violations.push({
        file,
        message: "FORBIDDEN: raw fetch() in adapter without approved HTTP client (createDsh*HttpClient or wltFetchJson)",
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
  }
}

fail(guardId, violations);
