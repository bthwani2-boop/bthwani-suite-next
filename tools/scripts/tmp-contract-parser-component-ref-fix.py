from pathlib import Path


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise SystemExit(f"missing anchors: {start_marker} -> {end_marker}")
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


path = Path("tools/guards/_openapi-utils.mjs")
text = path.read_text(encoding="utf-8")

component_parser = r'''function parseComponentParameters(lines) {
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
}'''

text = replace_between(
    text,
    "function parseComponentParameters",
    "const externalComponentParameterCache",
    component_parser,
)

resolver = r'''const rawComponentParameterCache = new Map();
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
}'''

text = replace_between(
    text,
    "const externalComponentParameterCache",
    "function collectParameters",
    resolver,
)

path.write_text(text, encoding="utf-8")
