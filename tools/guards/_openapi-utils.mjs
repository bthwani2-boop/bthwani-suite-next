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
  const nameLine = lines[startIndex];
  const nameMatch = nameLine.match(/-\s+name:\s*(.+?)\s*$/);
  if (!nameMatch) return null;

  const parameter = {
    name: parseScalar(nameMatch[1]),
    in: "",
    required: false,
  };

  const startIndent = countIndent(nameLine);
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const indent = countIndent(line);
    if (indent <= startIndent && line.trim().startsWith("- ")) break;
    if (indent <= 6 && /^[a-zA-Z0-9_-]+:/.test(line.trim())) break;

    const inMatch = line.match(/^\s+in:\s*(.+?)\s*$/);
    if (inMatch) parameter.in = parseScalar(inMatch[1]);

    const requiredMatch = line.match(/^\s+required:\s*(.+?)\s*$/);
    if (requiredMatch) parameter.required = parseScalar(requiredMatch[1]) === true;
  }

  return parameter;
}

function parseComponentParameters(lines) {
  const parameters = new Map();
  const parametersStart = lines.findIndex((line) => /^\s{2}parameters:\s*$/.test(line));
  if (parametersStart === -1) return parameters;

  for (let i = parametersStart + 1; i < lines.length; i++) {
    if (/^\s{2}[A-Za-z0-9_-]+:\s*$/.test(lines[i])) break;

    const inlineMatch = lines[i].match(/^\s{4}([A-Za-z0-9_-]+):\s*\{(.+)\}\s*$/);
    if (inlineMatch) {
      const body = inlineMatch[2];
      const parameter = { name: "", in: "", required: false };
      const nameMatch = body.match(/(?:^|,)\s*name:\s*([^,}]+)/);
      if (nameMatch) parameter.name = parseScalar(nameMatch[1]);
      const inMatch = body.match(/(?:^|,)\s*in:\s*([^,}]+)/);
      if (inMatch) parameter.in = parseScalar(inMatch[1]);
      const requiredMatch = body.match(/(?:^|,)\s*required:\s*([^,}]+)/);
      if (requiredMatch) parameter.required = parseScalar(requiredMatch[1]) === true;
      parameters.set(inlineMatch[1], parameter);
      continue;
    }

    const componentMatch = lines[i].match(/^\s{4}([A-Za-z0-9_-]+):\s*$/);
    if (!componentMatch) continue;

    const block = [lines[i]];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s{4}[A-Za-z0-9_-]+:\s*(?:\{.*\})?\s*$/.test(lines[j]) || /^\s{2}[A-Za-z0-9_-]+:\s*$/.test(lines[j])) break;
      block.push(lines[j]);
    }

    const parameter = { name: "", in: "", required: false };
    for (const line of block) {
      const trimmed = line.trim();
      const nameMatch = trimmed.match(/^name:\s*(.+?)\s*$/);
      if (nameMatch) parameter.name = parseScalar(nameMatch[1]);
      const inMatch = trimmed.match(/^in:\s*(.+?)\s*$/);
      if (inMatch) parameter.in = parseScalar(inMatch[1]);
      const requiredMatch = trimmed.match(/^required:\s*(.+?)\s*$/);
      if (requiredMatch) parameter.required = parseScalar(requiredMatch[1]) === true;
    }
    parameters.set(componentMatch[1], parameter);
  }

  return parameters;
}

function collectParameters(blockLines, componentParameters) {
  const parameters = [];
  for (let i = 0; i < blockLines.length; i++) {
    const trimmed = blockLines[i].trim();
    const inlineRefMatches = [...trimmed.matchAll(/\$ref:\s*["']?#\/components\/parameters\/([^"'\]\s}]+)["']?/g)];
    for (const inlineMatch of inlineRefMatches) {
      const parameter = componentParameters.get(inlineMatch[1]);
      if (parameter) parameters.push(parameter);
    }

    if (trimmed.startsWith("- name:")) {
      const parameter = parseParameterBlock(blockLines, i);
      if (parameter) parameters.push(parameter);
      continue;
    }

    const refMatch = trimmed.match(/^-\s+\$ref:\s*["']?#\/components\/parameters\/([^"']+)["']?\s*$/);
    if (refMatch) {
      const parameter = componentParameters.get(refMatch[1]);
      if (parameter) parameters.push(parameter);
    }
  }
  return parameters;
}

function parseOperationBlock({ file, apiPath, method, startLine, blockLines, componentParameters }) {
  const operation = {
    file,
    path: apiPath,
    method: method.toUpperCase(),
    line: startLine,
    operationId: "",
    parameters: collectParameters(blockLines, componentParameters),
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
