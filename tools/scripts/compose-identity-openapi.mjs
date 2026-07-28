#!/usr/bin/env node
// Composes core/identity/contracts/identity.openapi.yaml (a MIXED-layout entry —
// most paths/components stay inline; the employee-access module is $ref-based)
// into a fully self-contained generated/identity.bundle.openapi.yaml with only
// internal "#/..." references remaining (no external file refs), mirroring the
// shape DSH's bundle already has, but built with the real `yaml` library rather
// than DSH's hand-rolled line parser (no legacy bundle to stay byte-compatible with).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
export const entryContractPath = path.join(repoRoot, 'core/identity/contracts/identity.openapi.yaml');
export const generatedBundlePath = path.join(repoRoot, 'core/identity/contracts/generated/identity.bundle.openapi.yaml');

function loadYamlCached(absPath, cache) {
  const key = path.resolve(absPath);
  if (cache.has(key)) return cache.get(key);
  const doc = parseYaml(fs.readFileSync(key, 'utf8'));
  cache.set(key, doc);
  return doc;
}

function splitRef(refValue) {
  const hashIndex = refValue.indexOf('#');
  if (hashIndex === -1) return { filePart: refValue, fragment: '' };
  return { filePart: refValue.slice(0, hashIndex), fragment: refValue.slice(hashIndex) };
}

function walkPointer(doc, fragment) {
  if (!fragment || fragment === '#') return doc;
  const tokens = fragment.slice(2).split('/').map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node = doc;
  for (const token of tokens) {
    if (node == null) return undefined;
    node = node[token];
  }
  return node;
}

function isRefNode(node) {
  return node && typeof node === 'object' && !Array.isArray(node) && typeof node.$ref === 'string' && Object.keys(node).length === 1;
}

// Rewrites a $ref found inside `sourceFile` into a reference that is valid from
// within the final bundle document (entryContractPath's own directory), given that
// the bundle inlines identity.openapi.yaml's own components verbatim, and inlines
// each absorbed schema-fragment file's entries under components.schemas.<key>.
function rewriteRefForBundle(refValue, sourceFile) {
  const { filePart, fragment } = splitRef(refValue);
  if (!filePart) {
    // Bare "#/..." ref: only meaningful within a schema-fragment file (its top-level
    // keys become components.schemas.<key> in the bundle).
    if (path.resolve(sourceFile) === path.resolve(entryContractPath)) return refValue;
    const key = fragment.replace(/^#\//, '');
    return `#/components/schemas/${key}`;
  }
  const targetFile = path.resolve(path.dirname(sourceFile), filePart);
  if (targetFile === path.resolve(entryContractPath)) {
    return fragment || '#';
  }
  // A fragment file under components/schemas/ — its top-level keys map to components.schemas.<key>.
  if (path.dirname(targetFile) === path.resolve(repoRoot, 'core/identity/contracts/components/schemas')) {
    const key = fragment.replace(/^#\//, '');
    return `#/components/schemas/${key}`;
  }
  throw new Error(`Unsupported cross-file $ref "${refValue}" found while composing identity bundle (source: ${path.relative(repoRoot, sourceFile)})`);
}

function rewriteRefsDeep(node, sourceFile) {
  if (Array.isArray(node)) return node.map((item) => rewriteRefsDeep(item, sourceFile));
  if (node && typeof node === 'object') {
    if (isRefNode(node)) return { $ref: rewriteRefForBundle(node.$ref, sourceFile) };
    const result = {};
    for (const [key, value] of Object.entries(node)) result[key] = rewriteRefsDeep(value, sourceFile);
    return result;
  }
  return node;
}

// Resolves a $ref node to its concrete target object plus the file it came from,
// then rewrites any further $refs found inside that object for bundle validity.
function resolveForBundle(node, cache) {
  if (!isRefNode(node)) return node;
  const { filePart, fragment } = splitRef(node.$ref);
  const targetFile = path.resolve(path.dirname(entryContractPath), filePart);
  const doc = loadYamlCached(targetFile, cache);
  const resolved = walkPointer(doc, fragment);
  if (resolved === undefined) throw new Error(`Unresolvable $ref "${node.$ref}" while composing identity bundle`);
  return rewriteRefsDeep(resolved, targetFile);
}

export function composeIdentityOpenApi({ write = true } = {}) {
  const cache = new Map();
  const doc = loadYamlCached(entryContractPath, cache);
  const bundle = structuredClone(doc);

  for (const [pathKey, pathValue] of Object.entries(bundle.paths ?? {})) {
    if (isRefNode(pathValue)) {
      bundle.paths[pathKey] = resolveForBundle(pathValue, cache);
    }
  }

  const schemas = bundle.components?.schemas ?? {};
  for (const [schemaName, schemaValue] of Object.entries(schemas)) {
    if (isRefNode(schemaValue)) {
      schemas[schemaName] = resolveForBundle(schemaValue, cache);
    }
  }

  const header = [
    '# GENERATED FILE — do not edit by hand.',
    '# Produced by tools/scripts/compose-identity-openapi.mjs from core/identity/contracts/identity.openapi.yaml.',
    '# Run: pnpm run openapi:compose:identity',
  ].join('\n');
  const yamlText = stringifyYaml(bundle, { lineWidth: 0 });
  const output = `${header}\n${yamlText}`;

  if (write) {
    fs.mkdirSync(path.dirname(generatedBundlePath), { recursive: true });
    fs.writeFileSync(generatedBundlePath, output, 'utf8');
  }
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1] === fileURLToPath(import.meta.url)) {
  composeIdentityOpenApi({ write: true });
  console.log(`Wrote ${path.relative(repoRoot, generatedBundlePath)}`);
}
