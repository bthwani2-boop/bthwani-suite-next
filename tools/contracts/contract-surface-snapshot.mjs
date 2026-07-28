#!/usr/bin/env node
// Contract surface snapshot/compare tool for the OpenAPI contract hierarchy restructuring.
// Resolves local $ref chains with a real YAML parser (unlike the hand-rolled line
// parsers under tools/guards/_openapi-utils.mjs and tools/scripts/dsh-openapi-modular-lib.mjs)
// so operation/schema surfaces can be diffed before/after any contract file move.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const COMPONENT_SECTIONS = ['schemas', 'responses', 'parameters', 'requestBodies', 'headers', 'securitySchemes', 'examples', 'links', 'callbacks'];

function loadYamlCached(absPath, cache) {
  const key = path.resolve(absPath);
  if (cache.has(key)) return cache.get(key);
  const text = fs.readFileSync(key, 'utf8');
  const doc = parseYaml(text) ?? {};
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
  if (!fragment.startsWith('#/')) return doc;
  const tokens = fragment
    .slice(2)
    .split('/')
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node = doc;
  for (const token of tokens) {
    if (node == null) return undefined;
    node = node[token];
  }
  return node;
}

function isRefNode(node) {
  return node && typeof node === 'object' && typeof node.$ref === 'string';
}

// Follows a chain of $ref indirection (including refs into non-OpenAPI YAML
// fragment files under paths/ and components/) until a concrete node is reached.
function resolveNode(node, currentFile, cache, depth = 0) {
  let file = currentFile;
  while (isRefNode(node) && depth < 50) {
    const { filePart, fragment } = splitRef(node.$ref);
    const targetFile = filePart ? path.resolve(path.dirname(file), filePart) : file;
    const doc = loadYamlCached(targetFile, cache);
    node = fragment ? walkPointer(doc, fragment) : doc;
    file = targetFile;
    depth += 1;
  }
  return { node, file };
}

function collectComponentNames(doc, section) {
  return Object.keys(doc.components?.[section] ?? {});
}

function emitSurface(filePath) {
  const cache = new Map();
  const absPath = path.resolve(filePath);
  const doc = loadYamlCached(absPath, cache);
  const pathKeys = Object.keys(doc.paths ?? {});
  const operations = [];

  for (const pathKey of pathKeys) {
    const { node: pathItem } = resolveNode(doc.paths[pathKey], absPath, cache);
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      if (!(method in pathItem)) continue;
      const { node: operation } = resolveNode(pathItem[method], absPath, cache);
      operations.push({
        method: method.toUpperCase(),
        path: pathKey,
        operationId: operation?.operationId ?? null,
        tags: Array.isArray(operation?.tags) ? operation.tags : [],
        hasSecurity: Boolean(operation?.security),
      });
    }
  }

  const surface = {
    file: path.relative(process.cwd(), absPath).split(path.sep).join('/'),
    infoTitle: doc.info?.title ?? null,
    infoVersion: doc.info?.version ?? null,
    paths: pathKeys.sort(),
    operations: operations.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`)),
  };
  for (const section of COMPONENT_SECTIONS) {
    surface[section] = collectComponentNames(doc, section).sort();
  }
  return surface;
}

function mergeSurfaces(files) {
  const merged = {
    files: files.map((file) => path.relative(process.cwd(), path.resolve(file)).split(path.sep).join('/')),
    paths: new Set(),
    operations: new Map(), // "METHOD path" -> [{operationId, sourceFile}]
    collisions: [],
  };
  for (const section of COMPONENT_SECTIONS) merged[section] = new Map(); // name -> [sourceFile]

  for (const file of files) {
    const surface = emitSurface(file);
    for (const p of surface.paths) merged.paths.add(p);
    for (const op of surface.operations) {
      const key = `${op.method} ${op.path}`;
      const existing = merged.operations.get(key) ?? [];
      existing.push({ ...op, sourceFile: surface.file });
      merged.operations.set(key, existing);
    }
    for (const section of COMPONENT_SECTIONS) {
      for (const name of surface[section]) {
        const existing = merged[section].get(name) ?? [];
        existing.push(surface.file);
        merged[section].set(name, existing);
      }
    }
  }

  for (const [key, entries] of merged.operations) {
    if (entries.length > 1) merged.collisions.push({ methodPath: key, sources: entries.map((e) => e.sourceFile) });
  }

  const result = {
    files: merged.files,
    paths: [...merged.paths].sort(),
    operations: [...merged.operations.entries()]
      .map(([key, entries]) => ({ methodPath: key, operationIds: [...new Set(entries.map((e) => e.operationId))], sources: entries.map((e) => e.sourceFile) }))
      .sort((a, b) => a.methodPath.localeCompare(b.methodPath)),
    collisions: merged.collisions.sort((a, b) => a.methodPath.localeCompare(b.methodPath)),
  };
  for (const section of COMPONENT_SECTIONS) {
    result[section] = [...merged[section].keys()].sort();
  }
  return result;
}

function toComparableSets(surface) {
  const isUnion = Array.isArray(surface.files);
  const operationKeys = new Set();
  const operationIds = new Set();
  if (isUnion) {
    for (const op of surface.operations) {
      operationKeys.add(op.methodPath);
      for (const id of op.operationIds) if (id) operationIds.add(id);
    }
  } else {
    for (const op of surface.operations) {
      operationKeys.add(`${op.method} ${op.path}`);
      if (op.operationId) operationIds.add(op.operationId);
    }
  }
  const schemas = new Map();
  for (const section of COMPONENT_SECTIONS) schemas.set(section, new Set(surface[section] ?? []));
  return {
    paths: new Set(surface.paths ?? []),
    operationKeys,
    operationIds,
    schemas,
  };
}

function diffSet(before, after) {
  const added = [...after].filter((v) => !before.has(v)).sort();
  const removed = [...before].filter((v) => !after.has(v)).sort();
  return { added, removed };
}

function compareSurfaces(beforePath, afterPath, { allowAdded }) {
  const before = toComparableSets(JSON.parse(fs.readFileSync(beforePath, 'utf8')));
  const after = toComparableSets(JSON.parse(fs.readFileSync(afterPath, 'utf8')));

  const report = {
    paths: diffSet(before.paths, after.paths),
    operationKeys: diffSet(before.operationKeys, after.operationKeys),
    operationIds: diffSet(before.operationIds, after.operationIds),
    schemas: {},
  };
  let failed = false;
  for (const [section, beforeSet] of before.schemas) {
    const afterSet = after.schemas.get(section) ?? new Set();
    const d = diffSet(beforeSet, afterSet);
    report.schemas[section] = d;
    if (d.removed.length > 0) failed = true;
  }
  if (report.paths.removed.length > 0) failed = true;
  if (report.operationKeys.removed.length > 0) failed = true;
  if (report.operationIds.removed.length > 0) failed = true;
  if (!allowAdded) {
    if (report.paths.added.length > 0) failed = true;
    if (report.operationKeys.added.length > 0) failed = true;
    if (report.operationIds.added.length > 0) failed = true;
    for (const section of Object.keys(report.schemas)) {
      if (report.schemas[section].added.length > 0) failed = true;
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (failed) {
    console.error(`\ncontract-surface-snapshot: FAILED${allowAdded ? ' (removed items detected)' : ' (unexpected added/removed items detected; pass --allow-added to permit additions)'}`);
    process.exitCode = 1;
  } else {
    console.error('\ncontract-surface-snapshot: OK (no lost paths, operations, or schemas)');
  }
}

function writeOutput(value, outPath) {
  const json = JSON.stringify(value, null, 2);
  if (outPath) {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, `${json}\n`, 'utf8');
    console.error(`Wrote ${outPath}`);
  } else {
    console.log(json);
  }
}

function parseArgs(argv) {
  const args = { files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--emit') args.mode = 'emit';
    else if (token === '--union') args.mode = 'union';
    else if (token === '--compare') args.mode = 'compare';
    else if (token === '--allow-added') args.allowAdded = true;
    else if (token === '-o' || token === '--out') { args.out = argv[i + 1]; i += 1; }
    else args.files.push(token);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mode) {
    console.error('Usage:\n  contract-surface-snapshot.mjs --emit <file> [-o out.json]\n  contract-surface-snapshot.mjs --union <file...> [-o out.json]\n  contract-surface-snapshot.mjs --compare <before.json> <after.json> [--allow-added]');
    process.exitCode = 1;
    return;
  }
  if (args.mode === 'emit') {
    if (args.files.length !== 1) throw new Error('--emit requires exactly one file');
    writeOutput(emitSurface(args.files[0]), args.out);
  } else if (args.mode === 'union') {
    if (args.files.length < 1) throw new Error('--union requires at least one file');
    const merged = mergeSurfaces(args.files);
    if (merged.collisions.length > 0) {
      console.error(`WARNING: ${merged.collisions.length} method+path collision(s) across union input files:`);
      for (const collision of merged.collisions) {
        console.error(`  ${collision.methodPath} -> ${collision.sources.join(', ')}`);
      }
    }
    writeOutput(merged, args.out);
  } else if (args.mode === 'compare') {
    if (args.files.length !== 2) throw new Error('--compare requires exactly two files (before.json after.json)');
    compareSurfaces(args.files[0], args.files[1], { allowAdded: Boolean(args.allowAdded) });
  }
}

main();
