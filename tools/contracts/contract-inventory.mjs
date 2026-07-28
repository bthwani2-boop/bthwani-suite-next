#!/usr/bin/env node
// Repo-wide inventory of every OpenAPI contract/overlay file: owner, state, counts,
// and reachability from contracts/master.openapi.yaml. Read-only diagnostic —
// this is the Session 0 baseline report for the contract hierarchy restructuring.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const IGNORED_DIR_NAMES = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.nx', '.turbo']);
const CONTRACT_FILE_PATTERN = /\.(openapi\.ya?ml|overlay\.yaml)$/;

function walk(dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIR_NAMES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.isFile() && CONTRACT_FILE_PATTERN.test(entry.name)) {
      results.push(fullPath);
    }
  }
}

function toRepoRelative(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join('/');
}

function safeParseYaml(absPath) {
  try {
    return parseYaml(fs.readFileSync(absPath, 'utf8'));
  } catch (error) {
    return { __parseError: error.message };
  }
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function countSurface(doc) {
  if (!doc || typeof doc !== 'object' || doc.__parseError) return null;
  if (!doc.paths && !doc.components) return null; // not an OpenAPI-shaped document (e.g. bare fragment/overlay)
  const pathKeys = Object.keys(doc.paths ?? {});
  let operationCount = 0;
  for (const key of pathKeys) {
    const pathItem = doc.paths[key];
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      if (method in pathItem) operationCount += 1;
    }
  }
  const schemaCount = Object.keys(doc.components?.schemas ?? {}).length;
  return { pathCount: pathKeys.length, operationCount, schemaCount };
}

function loadMasterReferences() {
  const masterPath = path.join(repoRoot, 'contracts/master.openapi.yaml');
  if (!fs.existsSync(masterPath)) return { entries: [], version: null };
  const doc = safeParseYaml(masterPath);
  const entries = [];
  const groups = doc['x-bthwani-contracts'] ?? {};
  for (const [groupName, group] of Object.entries(groups)) {
    if (!group || typeof group !== 'object') continue;
    for (const [key, relativePath] of Object.entries(group)) {
      if (typeof relativePath !== 'string') continue;
      const absTarget = path.resolve(path.dirname(masterPath), relativePath);
      entries.push({ group: groupName, key, relativePath, absTarget: path.resolve(absTarget) });
    }
  }
  return { entries, version: doc.info?.version ?? null };
}

function main() {
  const files = [];
  walk(path.join(repoRoot, 'core'), files);
  walk(path.join(repoRoot, 'services'), files);
  walk(path.join(repoRoot, 'contracts'), files);
  walk(path.join(repoRoot, 'apps'), files);
  // Root-level contract files (e.g. openapi.yaml) are not under a directory walk above.
  for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (entry.isFile() && CONTRACT_FILE_PATTERN.test(entry.name)) {
      files.push(path.join(repoRoot, entry.name));
    }
  }

  const master = loadMasterReferences();
  const masterTargets = new Set(master.entries.map((e) => e.absTarget));

  const inventory = files
    .map((absPath) => {
      const doc = safeParseYaml(absPath);
      const surface = countSurface(doc);
      return {
        path: toRepoRelative(absPath),
        parseError: doc?.__parseError ?? null,
        infoTitle: doc?.info?.title ?? null,
        infoVersion: doc?.info?.version ?? null,
        owner: doc?.['x-bthwani-owner'] ?? null,
        contractState: doc?.['x-bthwani-contract-state'] ?? null,
        contractRole: doc?.['x-bthwani-contract-role'] ?? null,
        contractLayout: doc?.['x-bthwani-contract-layout'] ?? null,
        parentContract: doc?.['x-bthwani-parent-contract'] ?? null,
        extends: doc?.['x-bthwani-extends'] ?? null,
        bundle: doc?.['x-bthwani-bundle'] ?? null,
        isOverlaySpec: typeof doc?.overlay === 'string',
        isIndex: Boolean(doc?.['x-bthwani-contracts']),
        pathCount: surface?.pathCount ?? null,
        operationCount: surface?.operationCount ?? null,
        schemaCount: surface?.schemaCount ?? null,
        reachableFromMaster: masterTargets.has(path.resolve(absPath)),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const summary = {
    generatedAt: null,
    masterVersion: master.version,
    masterEntryCount: master.entries.length,
    totalContractFiles: inventory.length,
    reachableFromMasterCount: inventory.filter((i) => i.reachableFromMaster).length,
    unreachableFromMasterCount: inventory.filter((i) => !i.reachableFromMaster).length,
    overlayFileCount: inventory.filter((i) => i.isOverlaySpec).length,
    parseErrorCount: inventory.filter((i) => i.parseError).length,
  };

  console.log(JSON.stringify({ summary, masterEntries: master.entries.map(({ absTarget, ...rest }) => rest), inventory }, null, 2));
}

main();
