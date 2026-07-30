import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

function escapeJsonPointerToken(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function isLocalExternalReference(value) {
  if (typeof value !== "string" || value.startsWith("#")) return false;
  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(value)) return true;
  if (value.startsWith("/") || value.startsWith("\\")) return true;
  if (value.startsWith("//")) return false;
  return !URI_SCHEME_PATTERN.test(value);
}

function collectLocalExternalReferences(value, location, findings, visited) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectLocalExternalReferences(item, `${location}/${index}`, findings, visited));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (visited.has(value)) return;
  visited.add(value);

  for (const [key, item] of Object.entries(value)) {
    const itemLocation = `${location}/${escapeJsonPointerToken(key)}`;
    if (key === "$ref" && isLocalExternalReference(item)) {
      findings.push({ location: itemLocation, reference: item });
    }
    collectLocalExternalReferences(item, itemLocation, findings, visited);
  }
}

export function findUnresolvedLocalOpenApiReferences(bundle) {
  const document = typeof bundle === "string" ? parse(bundle) : bundle;
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Composed OpenAPI bundle must be an object.");
  }

  const findings = [];
  collectLocalExternalReferences(document, "#", findings, new Set());
  return findings;
}

export function assertNoUnresolvedLocalOpenApiReferences(
  bundle,
  { context = "unknown", bundlePath = "<memory>" } = {},
) {
  const findings = findUnresolvedLocalOpenApiReferences(bundle);
  if (findings.length === 0) return;

  const displayed = findings
    .slice(0, 20)
    .map(({ location, reference }) => `${location} -> ${reference}`)
    .join("; ");
  const omitted = findings.length > 20 ? `; ${findings.length - 20} more` : "";
  throw new Error(
    `${context}: composed bundle ${bundlePath} retains unresolved local OpenAPI references: ${displayed}${omitted}`,
  );
}

export function materializeVerifiedOpenApiBundle(result, repositoryRoot) {
  assertNoUnresolvedLocalOpenApiReferences(result.bundle, result);
  const bundleFile = path.join(repositoryRoot, result.bundlePath);
  const content = result.bundle.endsWith("\n") ? result.bundle : `${result.bundle}\n`;
  fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
  fs.writeFileSync(bundleFile, content, "utf8");
}
