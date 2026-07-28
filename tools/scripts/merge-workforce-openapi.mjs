#!/usr/bin/env node
// One-shot merge script for Session 4: absorbs workforce.operational-core.openapi.yaml,
// workforce.sovereign-leadership.openapi.yaml, and workforce.jrn-003.openapi.yaml into
// workforce.openapi.yaml as the single Workforce entry contract. Verified beforehand:
// zero path/operationId collisions and zero schema-name collisions across all 4 files;
// the only 2 component collisions (parameters.ActorId, securitySchemes.bearerAuth) are
// byte-identical across files, so a plain dedup-on-merge is safe (no $ref rewriting
// needed: all refs are same-document "#/components/..." and remain valid post-merge).
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const repoRoot = path.resolve(process.cwd());
const dir = path.join(repoRoot, 'core/workforce/contracts');
const primaryPath = path.join(dir, 'workforce.openapi.yaml');
const absorbedPaths = [
  path.join(dir, 'workforce.operational-core.openapi.yaml'),
  path.join(dir, 'workforce.sovereign-leadership.openapi.yaml'),
  path.join(dir, 'workforce.jrn-003.openapi.yaml'),
];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const primary = parseYaml(fs.readFileSync(primaryPath, 'utf8'));
primary.paths ??= {};
primary.components ??= {};

for (const absorbedPath of absorbedPaths) {
  const doc = parseYaml(fs.readFileSync(absorbedPath, 'utf8'));
  for (const [pathKey, value] of Object.entries(doc.paths ?? {})) {
    if (!(pathKey in primary.paths)) {
      primary.paths[pathKey] = value;
      continue;
    }
    // Same path key in both files: merge at the method level, only if methods are disjoint.
    const existingMethods = new Set(Object.keys(primary.paths[pathKey]));
    const incomingMethods = Object.keys(value);
    const overlap = incomingMethods.filter((m) => existingMethods.has(m));
    if (overlap.length > 0) {
      throw new Error(`Method collision on merge: ${overlap.join(',')} ${pathKey} from ${absorbedPath}`);
    }
    Object.assign(primary.paths[pathKey], value);
  }
  for (const [sectionName, section] of Object.entries(doc.components ?? {})) {
    primary.components[sectionName] ??= {};
    for (const [entryName, entryValue] of Object.entries(section ?? {})) {
      if (entryName in primary.components[sectionName]) {
        const existing = stableStringify(primary.components[sectionName][entryName]);
        const incoming = stableStringify(entryValue);
        if (existing !== incoming) {
          throw new Error(`Non-identical component collision on merge: components.${sectionName}.${entryName} from ${absorbedPath}`);
        }
        continue; // identical duplicate — safe to skip, refs remain valid
      }
      primary.components[sectionName][entryName] = entryValue;
    }
  }
}

primary.info.version = '0.2.0';
primary.info.description = `${primary.info.description ?? ''} Absorbs workforce.operational-core.openapi.yaml, workforce.sovereign-leadership.openapi.yaml, and workforce.jrn-003.openapi.yaml as the single Workforce entry contract.`.trim();

const header = '# Workforce single-entry contract. Absorbed operational-core, sovereign-leadership, and jrn-003 modules on the date of this merge.\n';
fs.writeFileSync(primaryPath, header + stringifyYaml(primary, { lineWidth: 0 }), 'utf8');
console.log(`Merged ${absorbedPaths.length} files into ${path.relative(repoRoot, primaryPath)}`);
