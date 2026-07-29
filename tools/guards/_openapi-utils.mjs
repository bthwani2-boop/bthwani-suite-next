import fs from "node:fs";
import path from "node:path";
import { read, repoRoot, toPosix } from "./_guard-utils.mjs";

export const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options"]);

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function countIndent(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function parseScalar(value) {
  const clean = unquote(value.replace(/\s+#.*$/, ""));
  if (clean === "true") return true;
  if (clean === "false") return false;
  if (clean === "[]") return [];
  return clean;
}

function parseServerBasePath(lines) {
  let insideServers = false;
  for (const line of lines) {
    if (/^servers:\s*$/.test(line)) {
      insideServers = true;
      continue;
    }
    if (insideServers && /^\S/.test(line) && !/^servers:\s*$/.test(line)) break;
    if (!insideServers) continue;
    const match = line.match(/^\s*-\s+url:\s*(.+?)\s*$/);
    if (!match) continue;
    const raw = parseScalar(match[1]);
    try {
      const pathname = /^https?:\/\//i.test(raw) ? new URL(raw).pathname : raw;
      const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
      return normalized === "/" ? "" : normalized.replace(/\/$/, "");
    } catch {
      return "";
    }
  }
  return "";
}

function applyServerBasePath(apiPath, serverBasePath) {
  if (!serverBasePath) return apiPath;
  if (apiPath === serverBasePath || apiPath.startsWith(`${serverBasePath}/`)) return apiPath;
  if (/^\/(?:dsh|wlt|identity|providers)(?:\/|$)/.test(apiPath)) return apiPath;
  return `${serverBasePath}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
}

function pathParamsFromPath(apiPath) {
  const params = [];
  const paramRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = paramRegex.exec(apiPath))) {
    const rawName = match[1];
    params.push({
      name: rawName.endsWith("...") ? rawName.slice(0, -3) : rawName,
      rawName,
      wildcard: rawName.endsWith("..."),
    });
  }
  return params;
}

function parseParameterBlock(lines, startIndex) {
  const startLine = lines[startIndex] ?? "";
  const trimmedStart = startLine.trim();
  if (!trimmedStart.startsWith("- ")) return { parameter: null, nextIndex: startIndex + 1 };

  const parameter = { name: "", in: "", required: false };
  const startIndent = countIndent(startLine);
  const applyField = (text) => {
    const match = String(text ?? "").trim().match(/^(name|in|required):\s*(.+)$/);
    if (!match) return;
    const [, key, rawValue] = match;
    const value = parseScalar(rawValue);
    if (key === "name") parameter.name = String(value);
    if (key === "in") parameter.in = String(value);
    if (key === "required") parameter.required = value === true;
  };

  const firstItem = trimmedStart.slice(2).trim();
  if (firstItem.startsWith("{") && firstItem.endsWith("}")) {
    const body = firstItem.slice(1, -1);
    for (const match of body.matchAll(/(?:^|,)\s*(name|in|required):\s*([^,}]+)/g)) {
      applyField(`${match[1]}: ${match[2]}`);
    }
    return { parameter: parameter.name ? parameter : null, nextIndex: startIndex + 1 };
  }

  applyField(firstItem);
  let nextIndex = startIndex + 1;
  for (; nextIndex < lines.length; nextIndex += 1) {
    const line = lines[nextIndex];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (countIndent(line) <= startIndent) break;
    applyField(trimmed);
  }
  return { parameter: parameter.name ? parameter : null, nextIndex };
}

function parseComponentParameters(lines) {
  const parameters = new Map();
  const wrapperStart = lines.findIndex((line) => /^\s{2}parameters:\s*$/.test(line));
  const entryIndent = wrapperStart === -1 ? 0 : 4;
  const startIndex = wrapperStart === -1 ? 0 : wrapperStart + 1;
  const entryPattern = new RegExp(`^\\s{${entryIndent}}([A-Za-z0-9_-]+):\\s*(?:\\{(.+)\\})?\\s*$`);

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (wrapperStart !== -1 && countIndent(line) <= 2) break;

    const entryMatch = line.match(entryPattern);
    if (!entryMatch) continue;
    const parameter = { name: "", in: "", required: false, ref: "" };
    const applyField = (value) => {
      const field = String(value ?? "").trim();
      const nameMatch = field.match(/^name:\s*(.+?)\s*$/);
      if (nameMatch) parameter.name = String(parseScalar(nameMatch[1]));
      const inMatch = field.match(/^in:\s*(.+?)\s*$/);
      if (inMatch) parameter.in = String(parseScalar(inMatch[1]));
      const requiredMatch = field.match(/^required:\s*(.+?)\s*$/);
      if (requiredMatch) parameter.required = parseScalar(requiredMatch[1]) === true;
      const refMatch = field.match(/^\$ref:\s*["']?([^"']+)["']?\s*$/);
      if (refMatch) parameter.ref = refMatch[1];
    };

    if (entryMatch[2]) {
      for (const match of entryMatch[2].matchAll(/(?:^|,)\s*(name|in|required|\$ref):\s*([^,}]+)/g)) {
        applyField(`${match[1]}: ${match[2]}`);
      }
    } else {
      for (let j = i + 1; j < lines.length; j += 1) {
        const blockLine = lines[j];
        const blockTrimmed = blockLine.trim();
        if (!blockTrimmed || blockTrimmed.startsWith("#")) continue;
        if (countIndent(blockLine) <= entryIndent) break;
        applyField(blockTrimmed);
      }
    }
    parameters.set(entryMatch[1], parameter);
  }

  return parameters;
}

const rawComponentParameterCache = new Map();
const resolvedComponentParameterCache = new Map();

function rawComponentParametersForFile(file) {
  if (rawComponentParameterCache.has(file)) return rawComponentParameterCache.get(file);
  const absolute = path.join(repoRoot, file);
  const parsed = fs.existsSync(absolute)
    ? parseComponentParameters(read(file).split(/\r?\n/))
    : new Map();
  rawComponentParameterCache.set(file, parsed);
  return parsed;
}

function splitParameterReference(reference, file) {
  const [referenceFile = "", pointer = ""] = String(reference).split("#", 2);
  const targetFile = referenceFile
    ? toPosix(path.relative(repoRoot, path.resolve(repoRoot, path.dirname(file), referenceFile)))
    : file;
  const normalizedPointer = pointer.replace(/^\//, "");
  const parameterName = normalizedPointer.startsWith("components/parameters/")
    ? normalizedPointer.slice("components/parameters/".length)
    : normalizedPointer;
  return { targetFile, parameterName };
}

function resolveComponentParameter(file, parameterName, visited = new Set()) {
  const key = `${file}#${parameterName}`;
  if (resolvedComponentParameterCache.has(key)) return resolvedComponentParameterCache.get(key);
  if (visited.has(key)) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(key);

  const parameter = rawComponentParametersForFile(file).get(parameterName);
  if (!parameter) return null;
  if (!parameter.ref) {
    resolvedComponentParameterCache.set(key, parameter);
    return parameter;
  }

  const target = splitParameterReference(parameter.ref, file);
  if (!target.parameterName || !target.targetFile || target.targetFile.startsWith("..")) return null;
  const resolved = resolveComponentParameter(target.targetFile, target.parameterName, nextVisited);
  if (resolved) resolvedComponentParameterCache.set(key, resolved);
  return resolved;
}

function componentParametersForFile(file) {
  const resolved = new Map();
  for (const name of rawComponentParametersForFile(file).keys()) {
    const parameter = resolveComponentParameter(file, name);
    if (parameter) resolved.set(name, parameter);
  }
  return resolved;
}

function resolveParameterReference(reference, file, componentParameters) {
  const target = splitParameterReference(reference, file);
  if (!target.parameterName) return null;
  if (!target.targetFile || target.targetFile.startsWith("..")) return null;

  const absolute = path.join(repoRoot, target.targetFile);
  if (fs.existsSync(absolute)) {
    return resolveComponentParameter(target.targetFile, target.parameterName);
  }
  return target.targetFile === file ? componentParameters.get(target.parameterName) ?? null : null;
}

function collectParameters(blockLines, componentParameters, file) {
  const parameters = [];
  for (let i = 0; i < blockLines.length; i += 1) {
    const trimmed = blockLines[i].trim();

    for (const match of trimmed.matchAll(/\$ref:\s*["']?([^"'\]\s}]+)["']?/g)) {
      const parameter = resolveParameterReference(match[1], file, componentParameters);
      if (parameter) parameters.push(parameter);
    }

    if (/^-\s*(?:name|in|required):/.test(trimmed) || /^-\s*\{/.test(trimmed)) {
      const parsed = parseParameterBlock(blockLines, i);
      if (parsed.parameter) parameters.push(parsed.parameter);
      i = Math.max(i, parsed.nextIndex - 1);
    }
  }

  const unique = new Map();
  for (const parameter of parameters) {
    const key = `${parameter.in}:${parameter.name}`;
    if (!unique.has(key)) unique.set(key, parameter);
  }
  return [...unique.values()];
}

function parseOperationBlock({ file, apiPath, method, startLine, blockLines, componentParameters }) {
  const operation = {
    file,
    path: apiPath,
    method: method.toUpperCase(),
    line: startLine,
    operationId: "",
    parameters: collectParameters(blockLines, componentParameters, file),
    pathParams: pathParamsFromPath(apiPath),
    responses: new Set(),
    extensions: new Map(),
    hasSecurity: false,
  };

  for (const line of blockLines) {
    const trimmed = line.trim();
    const operationMatch = trimmed.match(/^operationId:\s*(.+?)\s*$/);
    if (operationMatch) operation.operationId = parseScalar(operationMatch[1]);

    const extensionMatch = trimmed.match(/^(x-[A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (extensionMatch) operation.extensions.set(extensionMatch[1], parseScalar(extensionMatch[2]));

    if (/^security:\s*/.test(trimmed)) operation.hasSecurity = trimmed !== "security: []";

    const responseMatch = trimmed.match(/^["']?([1-5][0-9][0-9])["']?\s*:/);
    if (responseMatch) operation.responses.add(responseMatch[1]);
  }

  return operation;
}

export function parseOpenApiContractContent(content, file = "test.yaml") {
  const lines = content.split(/\r?\n/);
  const componentParameters = parseComponentParameters(lines);
  const serverBasePath = parseServerBasePath(lines);
  const operations = [];
  let currentPath = null;
  let currentPathIndent = -1;
  let currentPathBlock = [];
  let currentMethod = null;
  let currentStartLine = 0;
  let currentBlock = [];

  function flushOperation() {
    if (!currentPath || !currentMethod) return;
    operations.push(parseOperationBlock({
      file,
      apiPath: currentPath,
      method: currentMethod,
      startLine: currentStartLine,
      blockLines: currentBlock,
      componentParameters,
    }));
    currentMethod = null;
    currentBlock = [];
  }

  function closePath() {
    flushOperation();
    currentPath = null;
    currentPathIndent = -1;
    currentPathBlock = [];
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const pathMatch = line.match(/^(\s*)(["']?\/[^"']*["']?)\s*:/);
    if (pathMatch) {
      closePath();
      currentPath = applyServerBasePath(unquote(pathMatch[2]), serverBasePath);
      currentPathIndent = pathMatch[1].length;
      currentPathBlock = [line];
      continue;
    }

    if (!currentPath) continue;
    const trimmed = line.trim();
    const indent = countIndent(line);
    if (trimmed && !trimmed.startsWith("#") && indent <= currentPathIndent) {
      closePath();
      continue;
    }

    const methodMatch = line.match(new RegExp(`^\\s{${currentPathIndent + 2}}([a-z]+)\\s*:`));
    if (methodMatch && HTTP_METHODS.has(methodMatch[1])) {
      flushOperation();
      currentMethod = methodMatch[1];
      currentStartLine = index + 1;
      currentBlock = [...currentPathBlock, line];
      continue;
    }

    if (currentMethod) currentBlock.push(line);
    else currentPathBlock.push(line);
  }

  closePath();
  return operations;
}

function decodeJsonPointerPath(pointer) {
  let value = pointer.replace(/^paths\//, "");
  value = value.replace(/~1/g, "/").replace(/~0/g, "~");
  return value.startsWith("/") ? value : `/${value}`;
}

function parseExternalPathItemRefs(file, content, visited) {
  const lines = content.split(/\r?\n/);
  const operations = [];

  for (let index = 0; index < lines.length; index++) {
    const pathMatch = lines[index].match(/^(\s*)(["']?\/[^"']*["']?)\s*:/);
    if (!pathMatch) continue;
    const declaredPath = unquote(pathMatch[2]);
    const pathIndent = pathMatch[1].length;
    let refValue = "";

    for (let cursor = index + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor];
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && countIndent(line) <= pathIndent) break;
      const refMatch = trimmed.match(/^\$ref:\s*["']?([^"']+)["']?\s*$/);
      if (refMatch) {
        refValue = refMatch[1];
        break;
      }
    }

    if (!refValue || refValue.startsWith("#/")) continue;
    const [referenceFile, pointer = ""] = refValue.split("#", 2);
    if (!referenceFile) continue;
    const resolved = toPosix(path.relative(repoRoot, path.resolve(repoRoot, path.dirname(file), referenceFile)));
    const targetPath = pointer.startsWith("/") ? decodeJsonPointerPath(pointer.slice(1)) : declaredPath;
    const referencedOperations = parseOpenApiContract(resolved, visited);
    for (const operation of referencedOperations) {
      if (operation.path === targetPath || operation.path === declaredPath) operations.push(operation);
    }
  }

  return operations;
}

export function parseOpenApiContract(file, visited = new Set()) {
  if (visited.has(file)) return [];
  const nextVisited = new Set(visited);
  nextVisited.add(file);
  const content = read(file);
  const operations = [
    ...parseOpenApiContractContent(content, file),
    ...parseExternalPathItemRefs(file, content, nextVisited),
  ];

  const deduplicated = new Map();
  for (const operation of operations) {
    const key = `${operation.method} ${operation.path}`;
    if (!deduplicated.has(key)) deduplicated.set(key, operation);
  }
  return [...deduplicated.values()];
}

export function operationKey(operation) {
  return `${operation.method} ${operation.path}`;
}
