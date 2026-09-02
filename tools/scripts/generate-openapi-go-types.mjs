#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

const INITIALISMS = new Map([
  ["api", "API"],
  ["dsh", "DSH"],
  ["e164", "E164"],
  ["http", "HTTP"],
  ["id", "ID"],
  ["ip", "IP"],
  ["ms", "MS"],
  ["otp", "OTP"],
  ["rbac", "RBAC"],
  ["uri", "URI"],
  ["url", "URL"],
  ["uuid", "UUID"],
  ["wlt", "WLT"],
]);

const GO_KEYWORDS = new Set([
  "break", "default", "func", "interface", "select", "case", "defer", "go", "map", "struct",
  "chan", "else", "goto", "package", "switch", "const", "fallthrough", "if", "range", "type",
  "continue", "for", "import", "return", "var",
]);

function splitWords(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean);
}

export function goIdentifier(value) {
  const identifier = splitWords(value)
    .map((word) => INITIALISMS.get(word.toLowerCase()) ?? `${word[0].toUpperCase()}${word.slice(1)}`)
    .join("") || "Value";
  return GO_KEYWORDS.has(identifier) ? `${identifier}Value` : identifier;
}

function refName(reference) {
  return String(reference).split("/").at(-1) ?? "Value";
}

function primitiveType(schema) {
  if (schema?.const !== undefined) {
    if (typeof schema.const === "boolean") return "bool";
    if (typeof schema.const === "number") return Number.isInteger(schema.const) ? "int" : "float64";
    return "string";
  }
  if (schema?.type === "integer") return "int";
  if (schema?.type === "number") return "float64";
  if (schema?.type === "boolean") return "bool";
  if (schema?.type === "string") return schema.format === "date-time" ? "time.Time" : "string";
  return "any";
}

function inlineObjectType(schema) {
  const properties = Object.entries(schema?.properties ?? {}).sort(([left], [right]) => left.localeCompare(right));
  if (properties.length === 0) return schema?.additionalProperties === false ? "struct{}" : "map[string]any";

  const required = new Set(schema.required ?? []);
  const fields = properties.map(([property, propertySchema]) => {
    const fieldType = goType(propertySchema, !required.has(property));
    const optional = !required.has(property);
    const tag = optional ? `json:"${property},omitempty"` : `json:"${property}"`;
    return `\t${goIdentifier(property)} ${fieldType} \`${tag}\``;
  });
  return `struct {\n${fields.join("\n")}\n}`;
}

function goType(schema, optional = false) {
  let type;
  if (!schema || typeof schema !== "object") type = "any";
  else if (schema.$ref) type = refName(schema.$ref);
  else if (schema.type === "array") type = `[]${goType(schema.items)}`;
  else if (schema.type === "object") {
    if (schema.properties) type = inlineObjectType(schema);
    else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      type = `map[string]${goType(schema.additionalProperties)}`;
    } else type = "map[string]any";
  } else type = primitiveType(schema);

  if (optional && type === "time.Time") {
    return `*${type}`;
  }
  return type;
}

function inlineResponseSchemas(document) {
  const responses = new Map();
  for (const [route, operations] of Object.entries(document.paths ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    void route;
    for (const [method, operation] of Object.entries(operations ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
      void method;
      if (!operation?.operationId) continue;
      for (const response of Object.values(operation.responses ?? {})) {
        const schema = response?.content?.["application/json"]?.schema;
        if (schema?.type === "object" && !schema.$ref) {
          const name = `${goIdentifier(operation.operationId)}Response`;
          if (!responses.has(name)) responses.set(name, schema);
        }
      }
    }
  }
  return responses;
}

function schemaNeedsTime(schema) {
  if (!schema || typeof schema !== "object") return false;
  if (schema.format === "date-time") return true;
  return Object.values(schema).some((value) => {
    if (Array.isArray(value)) return value.some(schemaNeedsTime);
    return schemaNeedsTime(value);
  });
}

function renderNamedSchema(name, schema) {
  if (schema?.type === "object") {
    return `// ${name} defines model for ${name}.\ntype ${name} ${inlineObjectType(schema)}\n`;
  }
  return `// ${name} defines model for ${name}.\ntype ${name} ${goType(schema)}\n`;
}

export function generateGoTypesFromDocument(document, contractPath = "OpenAPI contract") {
  if (!document || typeof document !== "object") throw new Error(`${contractPath} must be an OpenAPI document`);
  const schemas = new Map(Object.entries(document.components?.schemas ?? {}));
  for (const [name, schema] of inlineResponseSchemas(document)) {
    if (!schemas.has(name)) schemas.set(name, schema);
  }

  const output = [
    "// Code generated by tools/scripts/generate-openapi-go-types.mjs from OpenAPI. DO NOT EDIT.",
    `// Contract: ${contractPath}`,
    "",
    "package identityauth",
    "",
  ];
  if ([...schemas.values()].some(schemaNeedsTime)) {
    output.push('import "time"', "");
  }
  for (const [name, schema] of [...schemas.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    output.push(renderNamedSchema(name, schema), "");
  }

  const unformatted = `${output.join("\n").trimEnd()}\n`;
  return execFileSync("gofmt", [], { input: unformatted, encoding: "utf8" });
}

export function generateGoTypesFromFile(inputPath, contractPath = inputPath) {
  const absolutePath = path.resolve(inputPath);
  const document = parse(fs.readFileSync(absolutePath, "utf8"));
  return generateGoTypesFromDocument(document, contractPath.replaceAll(path.sep, "/"));
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = argumentValue(process.argv.slice(2), "--input");
  const output = argumentValue(process.argv.slice(2), "--output");
  if (!input || !output) {
    console.error("usage: generate-openapi-go-types.mjs --input <bundle.yaml> --output <types.go>");
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, generateGoTypesFromFile(input), "utf8");
}
