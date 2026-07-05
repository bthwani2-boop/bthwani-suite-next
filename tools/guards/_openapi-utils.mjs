import { read } from "./_guard-utils.mjs";

export const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options"]);

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
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
  const parametersStart = lines.findIndex((line) => line === "  parameters:");
  if (parametersStart === -1) return parameters;

  for (let i = parametersStart + 1; i < lines.length; i++) {
    const componentMatch = lines[i].match(/^    ([A-Za-z0-9_-]+):\s*$/);
    if (!componentMatch) {
      if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) break;
      continue;
    }

    const block = [lines[i]];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^    [A-Za-z0-9_-]+:\s*$/.test(lines[j]) || /^  [A-Za-z0-9_-]+:\s*$/.test(lines[j])) break;
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

  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];
    const trimmed = line.trim();

    const operationMatch = trimmed.match(/^operationId:\s*(.+?)\s*$/);
    if (operationMatch) operation.operationId = parseScalar(operationMatch[1]);

    const extensionMatch = trimmed.match(/^(x-[A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (extensionMatch) operation.extensions.set(extensionMatch[1], parseScalar(extensionMatch[2]));

    if (/^security:\s*/.test(trimmed)) {
      operation.hasSecurity = trimmed !== "security: []";
    }

    const responseMatch = trimmed.match(/^["']?([1-5][0-9][0-9])["']?\s*:/);
    if (responseMatch) operation.responses.add(responseMatch[1]);

  }

  return operation;
}

export function parseOpenApiContract(file) {
  const content = read(file);
  const lines = content.split(/\r?\n/);
  const componentParameters = parseComponentParameters(lines);
  const operations = [];
  let currentPath = null;
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
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const pathMatch = line.match(/^  (["']?\/[^"']*["']?)\s*:/);
    if (pathMatch) {
      flushOperation();
      currentPath = unquote(pathMatch[1]);
      currentPathBlock = [line];
      currentMethod = null;
      currentBlock = [];
      continue;
    }

    if (currentPath) {
      const methodMatch = line.match(/^    ([a-z]+)\s*:/);
      if (methodMatch && HTTP_METHODS.has(methodMatch[1])) {
        flushOperation();
        currentMethod = methodMatch[1];
        currentStartLine = index + 1;
        currentBlock = [...currentPathBlock, line];
        continue;
      }
    }

    if (currentMethod) currentBlock.push(line);
    if (currentPath && !currentMethod) currentPathBlock.push(line);
  }

  flushOperation();
  return operations;
}

export function operationKey(operation) {
  return `${operation.method} ${operation.path}`;
}
