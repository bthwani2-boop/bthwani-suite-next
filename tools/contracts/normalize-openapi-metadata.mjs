import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

function yamlString(value) {
  return JSON.stringify(String(value));
}

function cleanScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveTag(apiPath, contractPath) {
  const segments = apiPath.split("/").filter(Boolean);
  const root = segments[0] || basename(contractPath).replace(/\.openapi\.ya?ml$/i, "");
  if (root === "dsh") {
    const surface = segments[1];
    return surface && ["client", "partner", "captain", "field", "operator", "internal", "public", "support"].includes(surface)
      ? `DSH ${titleCase(surface)}`
      : "DSH";
  }
  if (root === "wlt") return "WLT";
  if (root === "workforce") return "Workforce";
  if (root === "auth" || root === "identity") return "Identity";
  if (root === "providers") return "Providers";
  if (root === "platform-control") return "Platform Control";
  return titleCase(root) || "API";
}

function operationDescription(lines, start, end, method, apiPath) {
  for (let index = start + 1; index < end; index += 1) {
    const summary = lines[index].match(/^\s{6}summary:\s*(.+?)\s*$/);
    if (summary) {
      const value = cleanScalar(summary[1]);
      if (value && value !== "|" && value !== ">") return value.endsWith(".") ? value : `${value}.`;
    }
  }
  for (let index = start + 1; index < end; index += 1) {
    const operationId = lines[index].match(/^\s{6}operationId:\s*(.+?)\s*$/);
    if (operationId) {
      const value = cleanScalar(operationId[1]);
      if (value) return `Executes the ${value} operation.`;
    }
  }
  return `${method.toUpperCase()} ${apiPath} operation.`;
}

function findTopLevelBlockEnd(lines, start) {
  let index = start + 1;
  while (index < lines.length && (!/^\S/.test(lines[index]) || /^\s/.test(lines[index]))) index += 1;
  return index;
}

function collectSchemaNames(lines) {
  const componentsIndex = lines.findIndex((line) => line === "components:");
  if (componentsIndex < 0) return [];
  const componentsEnd = findTopLevelBlockEnd(lines, componentsIndex);
  const schemasIndex = lines.findIndex((line, index) => index > componentsIndex && index < componentsEnd && line === "  schemas:");
  if (schemasIndex < 0) return [];
  const names = [];
  for (let index = schemasIndex + 1; index < componentsEnd; index += 1) {
    const match = lines[index].match(/^\s{4}([^#][^:]+):\s*$/);
    if (match) names.push(match[1].trim());
  }
  return names;
}

export function normalizeOpenApiMetadata(source, contractPath = "contract.openapi.yaml") {
  const originalTrailingNewline = source.endsWith("\n");
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const pathsIndex = lines.findIndex((line) => line === "paths:");
  if (pathsIndex < 0) return source;

  const operations = [];
  let currentPath = "";
  for (let index = pathsIndex + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) break;
    const pathMatch = lines[index].match(/^\s{2}(\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    const methodMatch = lines[index].match(/^\s{4}(get|post|put|patch|delete|options|head|trace):\s*$/i);
    if (methodMatch && currentPath) operations.push({ start: index, method: methodMatch[1].toLowerCase(), apiPath: currentPath });
  }

  for (let index = 0; index < operations.length; index += 1) {
    operations[index].end = index + 1 < operations.length ? operations[index + 1].start : lines.findIndex((line, lineIndex) => lineIndex > operations[index].start && (/^\s{2}\/[^:]+:\s*$/.test(line) || /^\S/.test(line)));
    if (operations[index].end < 0) operations[index].end = lines.length;
  }

  const edits = [];
  const operationTags = new Set();
  for (const operation of operations) {
    const block = lines.slice(operation.start + 1, operation.end);
    const descriptionIndex = block.findIndex((line) => /^\s{6}description:\s*\S/.test(line));
    const tagsLineIndex = block.findIndex((line) => /^\s{6}tags:\s*/.test(line));
    const existingTagLines = block
      .slice(tagsLineIndex >= 0 ? tagsLineIndex + 1 : 0)
      .filter((line) => /^\s{8}-\s+\S/.test(line));
    for (const line of existingTagLines) operationTags.add(cleanScalar(line.replace(/^\s{8}-\s+/, "")));

    const inserts = [];
    if (descriptionIndex < 0) inserts.push(`      description: ${yamlString(operationDescription(lines, operation.start, operation.end, operation.method, operation.apiPath))}`);

    const hasNonEmptyTag = existingTagLines.length > 0 || (tagsLineIndex >= 0 && /^\s{6}tags:\s*\[\s*[^\]]+\s*\]\s*$/.test(block[tagsLineIndex]));
    if (!hasNonEmptyTag) {
      const tag = deriveTag(operation.apiPath, contractPath);
      operationTags.add(tag);
      if (tagsLineIndex >= 0) {
        edits.push({ index: operation.start + 1 + tagsLineIndex, deleteCount: 1, lines: [`      tags:`, `        - ${yamlString(tag)}`] });
      } else {
        inserts.push(`      tags:`, `        - ${yamlString(tag)}`);
      }
    }
    if (inserts.length) edits.push({ index: operation.start + 1, deleteCount: 0, lines: inserts });

    const responsesRelativeIndex = block.findIndex((line) => /^\s{6}responses:\s*$/.test(line));
    if (responsesRelativeIndex >= 0) {
      const responsesStart = operation.start + 1 + responsesRelativeIndex;
      let responsesEnd = operation.end;
      for (let lineIndex = responsesStart + 1; lineIndex < operation.end; lineIndex += 1) {
        if (/^\s{6}\S/.test(lines[lineIndex])) {
          responsesEnd = lineIndex;
          break;
        }
      }
      const hasSuccess = lines.slice(responsesStart + 1, responsesEnd).some((line) => /^\s{8}["']?[23]\d\d["']?:/.test(line));
      if (!hasSuccess) {
        edits.push({
          index: responsesStart + 1,
          deleteCount: 0,
          lines: [`        "204":`, `          description: "Operation completed successfully."`],
        });
      }
    }
  }

  edits.sort((left, right) => right.index - left.index);
  for (const edit of edits) lines.splice(edit.index, edit.deleteCount, ...edit.lines);

  const refreshedPathsIndex = lines.findIndex((line) => line === "paths:");
  const infoIndex = lines.findIndex((line) => line === "info:");
  if (infoIndex >= 0) {
    const infoEnd = findTopLevelBlockEnd(lines, infoIndex);
    if (!lines.slice(infoIndex + 1, infoEnd).some((line) => /^\s{2}contact:\s*$/.test(line))) {
      lines.splice(infoEnd, 0, "  contact:", "    name: \"BThwani API Governance\"");
    }
  }

  const hasServers = lines.some((line, index) => line === "servers:" && lines.slice(index + 1, findTopLevelBlockEnd(lines, index)).some((entry) => /^\s{2}-\s+url:\s*\S/.test(entry)));
  if (!hasServers) {
    const insertion = lines.findIndex((line) => line === "paths:");
    lines.splice(insertion, 0, "servers:", "  - url: /", "    description: \"Current deployment origin\"", "");
  }

  const tagsIndex = lines.findIndex((line) => line === "tags:");
  const definedTags = new Set();
  if (tagsIndex >= 0) {
    const tagsEnd = findTopLevelBlockEnd(lines, tagsIndex);
    for (const line of lines.slice(tagsIndex + 1, tagsEnd)) {
      const match = line.match(/^\s{2}-\s+name:\s*(.+?)\s*$/);
      if (match) definedTags.add(cleanScalar(match[1]));
    }
    const missing = [...operationTags].filter(Boolean).filter((tag) => !definedTags.has(tag)).sort();
    if (missing.length) {
      lines.splice(tagsEnd, 0, ...missing.flatMap((tag) => [`  - name: ${yamlString(tag)}`, `    description: ${yamlString(`${tag} operations.`)}`]));
    }
  } else if (operationTags.size) {
    const insertion = lines.findIndex((line) => line === "paths:");
    const tagLines = [...operationTags].filter(Boolean).sort().flatMap((tag) => [`  - name: ${yamlString(tag)}`, `    description: ${yamlString(`${tag} operations.`)}`]);
    lines.splice(insertion, 0, "tags:", ...tagLines, "");
  }

  const schemaNames = collectSchemaNames(lines);
  if (schemaNames.length && !lines.some((line) => line === "x-bthwani-exported-components:")) {
    const insertion = lines.findIndex((line) => line === "components:");
    const exportLines = [
      "x-bthwani-exported-components:",
      "  description: \"Schemas intentionally exported for generated clients and cross-service composition.\"",
      "  schemas:",
      ...schemaNames.sort().map((name) => `    - $ref: ${yamlString(`#/components/schemas/${name}`)}`),
      "",
    ];
    lines.splice(insertion >= 0 ? insertion : lines.length, 0, ...exportLines);
  }

  const normalized = lines.join("\n");
  return originalTrailingNewline ? `${normalized.replace(/\n+$/, "")}\n` : normalized.replace(/\n+$/, "");
}

export function normalizeOpenApiFile(inputPath, outputPath) {
  const source = readFileSync(inputPath, "utf8");
  writeFileSync(outputPath, normalizeOpenApiMetadata(source, inputPath), "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || join(dirname(inputPath), `.${basename(inputPath)}.normalized.yaml`);
  if (!inputPath) throw new Error("Usage: node normalize-openapi-metadata.mjs <input> [output]");
  normalizeOpenApiFile(inputPath, outputPath);
  console.log(outputPath);
}
