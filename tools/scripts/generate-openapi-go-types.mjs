#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const identityGoModuleFile = path.resolve(scriptDirectory, "../../core/identity/clients/go/identityauth/go.mod");

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

function unsupportedSchema(contractPath, schemaPath, schema) {
  const keys = schema && typeof schema === "object" ? Object.keys(schema).sort().join(",") : "non-object";
  throw new Error(`${contractPath}: unsupported OpenAPI schema at ${schemaPath} (${keys || "empty schema"}).`);
}

function rejectUnsupportedKeywords(schema, contractPath, schemaPath) {
  for (const keyword of ["oneOf", "anyOf", "allOf", "not", "if", "then", "else", "patternProperties", "dependentSchemas"]) {
    if (Object.hasOwn(schema, keyword)) unsupportedSchema(contractPath, `${schemaPath}.${keyword}`, schema);
  }
}

function primitiveType(schema, contractPath, schemaPath) {
  rejectUnsupportedKeywords(schema, contractPath, schemaPath);
  if (schema?.const !== undefined) {
    if (typeof schema.const === "boolean") return "bool";
    if (typeof schema.const === "number") return Number.isInteger(schema.const) ? "int" : "float64";
    if (typeof schema.const === "string") return "string";
    unsupportedSchema(contractPath, schemaPath, schema);
  }
  if (schema?.type === "integer") return "int";
  if (schema?.type === "number") return "float64";
  if (schema?.type === "boolean") return "bool";
  if (schema?.type === "string") return schema.format === "date-time" ? "time.Time" : "string";
  unsupportedSchema(contractPath, schemaPath, schema);
}

function inlineObjectType(schema, contractPath, schemaPath) {
  rejectUnsupportedKeywords(schema, contractPath, schemaPath);
  const properties = Object.entries(schema?.properties ?? {}).sort(([left], [right]) => left.localeCompare(right));
  if (properties.length === 0) {
    if (schema?.additionalProperties === false) return "struct{}";
    if (schema?.additionalProperties && typeof schema.additionalProperties === "object") {
      return `map[string]${goType(schema.additionalProperties, false, contractPath, `${schemaPath}.additionalProperties`)}`;
    }
    return "map[string]any";
  }

  const required = new Set(schema.required ?? []);
  const fields = properties.map(([property, propertySchema]) => {
    const fieldType = goType(propertySchema, !required.has(property), contractPath, `${schemaPath}.properties.${property}`);
    const optional = !required.has(property);
    const tag = optional ? `json:"${property},omitempty"` : `json:"${property}"`;
    return `\t${goIdentifier(property)} ${fieldType} \`${tag}\``;
  });
  return `struct {\n${fields.join("\n")}\n}`;
}

function goType(schema, optional = false, contractPath = "OpenAPI contract", schemaPath = "schema") {
  let type;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) unsupportedSchema(contractPath, schemaPath, schema);
  rejectUnsupportedKeywords(schema, contractPath, schemaPath);
  if (schema.$ref) {
    if (typeof schema.$ref !== "string" || schema.$ref.trim() === "") unsupportedSchema(contractPath, schemaPath, schema);
    type = refName(schema.$ref);
  } else if (schema.type === "array") {
    if (!Object.hasOwn(schema, "items")) unsupportedSchema(contractPath, schemaPath, schema);
    type = `[]${goType(schema.items, false, contractPath, `${schemaPath}.items`)}`;
  }
  else if (schema.type === "object") {
    if (schema.properties !== undefined && (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties))) {
      unsupportedSchema(contractPath, `${schemaPath}.properties`, schema.properties);
    }
    if (schema.properties !== undefined) type = inlineObjectType(schema, contractPath, schemaPath);
    else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      type = `map[string]${goType(schema.additionalProperties, false, contractPath, `${schemaPath}.additionalProperties`)}`;
    } else if (schema.additionalProperties === false) type = "struct{}";
    else if (schema.additionalProperties === true || schema.additionalProperties === undefined) type = "map[string]any";
    else unsupportedSchema(contractPath, `${schemaPath}.additionalProperties`, schema);
  } else type = primitiveType(schema, contractPath, schemaPath);

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

function formatWithPinnedGoToolchain(source, contractPath) {
  const moduleSource = fs.readFileSync(identityGoModuleFile, "utf8");
  const pinnedVersion = moduleSource.match(/^go\s+(\d+\.\d+\.\d+)\s*$/mu)?.[1];
  if (!pinnedVersion) {
    throw new Error(`${contractPath}: Identity Go module must declare an exact Go version for deterministic formatting.`);
  }

  let goEnv;
  try {
    goEnv = execFileSync("go", ["env", "GOVERSION", "GOROOT"], {
      encoding: "utf8",
      env: { ...process.env, GOTOOLCHAIN: "local" },
    }).trim().split(/\r?\n/u);
  } catch (error) {
    throw new Error(`${contractPath}: pinned Go toolchain is unavailable: ${error.message}`);
  }
  const [goVersion, goRoot] = goEnv;
  if (goVersion !== `go${pinnedVersion}` || !goRoot) {
    throw new Error(`${contractPath}: expected Go ${pinnedVersion}, found ${goVersion || "unknown"}.`);
  }
  const gofmt = path.join(goRoot, "bin", process.platform === "win32" ? "gofmt.exe" : "gofmt");
  if (!fs.existsSync(gofmt)) throw new Error(`${contractPath}: pinned gofmt is missing at ${gofmt}.`);
  return execFileSync(gofmt, [], {
    input: source,
    encoding: "utf8",
    env: { ...process.env, GOTOOLCHAIN: "local" },
  });
}

function renderNamedSchema(name, schema, contractPath) {
  if (schema?.type === "object") {
    return `// ${name} defines model for ${name}.\ntype ${name} ${inlineObjectType(schema, contractPath, `components.schemas.${name}`)}\n`;
  }
  return `// ${name} defines model for ${name}.\ntype ${name} ${goType(schema, false, contractPath, `components.schemas.${name}`)}\n`;
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
    output.push(renderNamedSchema(name, schema, contractPath), "");
  }

  const unformatted = `${output.join("\n").trimEnd()}\n`;
  return formatWithPinnedGoToolchain(unformatted, contractPath);
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
