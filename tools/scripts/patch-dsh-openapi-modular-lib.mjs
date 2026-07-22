import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const libraryPath = path.join(repositoryRoot, 'tools/scripts/dsh-openapi-modular-lib.mjs');
let source = fs.readFileSync(libraryPath, 'utf8');

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    throw new Error(`Unable to patch modular library between ${startMarker} and ${endMarker}.`);
  }
  source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

replaceBetween(
  'function rewriteRefs(text, transform) {',
  '\nfunction decodeYamlKey',
  `function rewriteRefs(text, transform) {
  return text
    .split('\\n')
    .map((line) => line.replace(
      /(\\$ref:\\s*)(["']?)([^"'\\s,}\\]]+)\\2/g,
      (_match, prefix, quote, value) => {
        const nextValue = transform(value);
        const resolvedQuote = quote || '"';
        return \`\${prefix}\${resolvedQuote}\${nextValue}\${resolvedQuote}\`;
      },
    ))
    .join('\\n');
}
`,
);

replaceBetween(
  'function parsePreparationFragment(fragmentFile) {',
  '\nfunction assertUnique',
  `function parseGovernedFragment(fragmentFile) {
  if (!fs.existsSync(fragmentFile)) return { paths: [], schemas: [], pickupSessionProperties: [] };
  const lines = readText(fragmentFile).split('\\n');
  const pathMarker = lines.indexOf('# @paths');
  const schemaMarker = lines.indexOf('# @schemas');
  const pickupPropertiesMarker = lines.indexOf('# @pickup-session-properties');
  if (pathMarker === -1 || schemaMarker === -1 || schemaMarker <= pathMarker) {
    throw new Error(\`\${fragmentFile} must contain # @paths and # @schemas markers.\`);
  }
  if (pickupPropertiesMarker !== -1 && (pickupPropertiesMarker <= pathMarker || pickupPropertiesMarker >= schemaMarker)) {
    throw new Error(\`\${fragmentFile} has an invalid # @pickup-session-properties marker.\`);
  }
  const pathsEnd = pickupPropertiesMarker === -1 ? schemaMarker : pickupPropertiesMarker;
  return {
    paths: parseEntries(lines, pathMarker + 1, pathsEnd, 2, (key) => key.startsWith('/')),
    pickupSessionProperties: pickupPropertiesMarker === -1
      ? []
      : trimTrailingBlankLines(lines.slice(pickupPropertiesMarker + 1, schemaMarker)),
    schemas: parseEntries(lines, schemaMarker + 1, lines.length, 4),
  };
}
`,
);

replaceBetween(
  'function mergePreparationFragment(structure) {',
  '\nfunction readPackageJson',
  `function mergeGovernedFragments(structure) {
  const fragmentFiles = [
    path.join(contractsDirectory, 'fragments/order-preparation-handoff.fragment.yaml'),
    path.join(contractsDirectory, 'fragments/pickup-recovery.fragment.yaml'),
  ].filter((filePath) => fs.existsSync(filePath));
  if (fragmentFiles.length === 0) return { ...structure, fragmentFiles: [] };

  const existingPaths = new Set(structure.pathEntries.map((entry) => entry.key));
  const schemasSection = structure.componentSections.find((section) => section.name === 'schemas');
  if (!schemasSection) throw new Error('DSH contract must contain components.schemas.');
  const existingSchemas = new Set(schemasSection.entries.map((entry) => entry.key));
  const addedPaths = [];
  const addedSchemas = [];
  const pickupSessionProperties = [];

  for (const fragmentFile of fragmentFiles) {
    const fragment = parseGovernedFragment(fragmentFile);
    for (const entry of fragment.paths) {
      if (existingPaths.has(entry.key)) throw new Error(\`\${fragmentFile} duplicates path \${entry.key}\`);
      existingPaths.add(entry.key);
      addedPaths.push(entry);
    }
    for (const entry of fragment.schemas) {
      if (existingSchemas.has(entry.key)) throw new Error(\`\${fragmentFile} duplicates schema \${entry.key}\`);
      existingSchemas.add(entry.key);
      addedSchemas.push(entry);
    }
    pickupSessionProperties.push(...fragment.pickupSessionProperties);
  }

  let mergedSchemas = [...schemasSection.entries, ...addedSchemas];
  if (pickupSessionProperties.length > 0) {
    mergedSchemas = mergedSchemas.map((entry) => {
      if (entry.key !== 'DshPickupSession') return entry;
      if (entry.lines.some((line) => line.includes('customerNotifiedAt:'))) {
        throw new Error('DshPickupSession already contains pickup recovery properties.');
      }
      const anchorIndex = entry.lines.findIndex((line) => line.trim() === 'version: { type: integer }');
      if (anchorIndex === -1) throw new Error('DshPickupSession is missing its version property anchor.');
      return {
        ...entry,
        lines: [
          ...entry.lines.slice(0, anchorIndex),
          ...pickupSessionProperties,
          ...entry.lines.slice(anchorIndex),
        ],
      };
    });
  }

  return {
    ...structure,
    pathEntries: [...structure.pathEntries, ...addedPaths],
    componentSections: structure.componentSections.map((section) =>
      section.name === 'schemas' ? { ...section, entries: mergedSchemas } : section,
    ),
    fragmentFiles,
  };
}
`,
);

replaceBetween(
  'function collectSiblingContractOwnership(currentPathKeys) {',
  '\nfunction readModuleEntry',
  `function collectSiblingContractOwnership(currentPathKeys) {
  const report = {
    formatVersion: 2,
    sovereignContract: 'services/dsh/contracts/dsh.openapi.yaml',
    governedProjectionPaths: [],
    orphanProjectionPaths: [],
    projectionCollisions: [],
    siblingContracts: {},
  };
  const current = new Set(currentPathKeys);
  const projectionOwners = new Map();

  for (const name of fs.readdirSync(contractsDirectory).sort()) {
    if (!name.endsWith('.openapi.yaml') || name === 'dsh.openapi.yaml') continue;
    const filePath = path.join(contractsDirectory, name);
    if (!fs.statSync(filePath).isFile()) continue;
    const text = readText(filePath);
    const owner = text.match(/^x-bthwani-owner:\\s*(.+)$/m)?.[1]?.trim() ?? 'services/dsh';
    const parentContract = text.match(/^x-bthwani-parent-contract:\\s*(.+)$/m)?.[1]?.trim() ?? null;
    const contractRole = text.match(/^x-bthwani-contract-role:\\s*(.+)$/m)?.[1]?.trim() ?? 'governed-projection';
    let structure;
    try {
      structure = parseContractStructure(text);
    } catch {
      const lines = text.split('\\n');
      const pathsIndex = findTopLevelSection(lines, 'paths');
      if (pathsIndex === -1) continue;
      const end = findTopLevelSectionEnd(lines, pathsIndex);
      structure = {
        pathEntries: parseEntries(lines, pathsIndex + 1, end, 2, (key) => key.startsWith('/')),
      };
    }
    const paths = structure.pathEntries.map((entry) => entry.key);
    report.siblingContracts[name] = {
      pathCount: paths.length,
      owner,
      parentContract,
      contractRole,
    };
    for (const pathKey of paths) {
      const owners = projectionOwners.get(pathKey) ?? [];
      owners.push(name);
      projectionOwners.set(pathKey, owners);
      if (current.has(pathKey)) {
        report.governedProjectionPaths.push({
          path: pathKey,
          projectionContract: name,
        });
      } else {
        report.orphanProjectionPaths.push({
          path: pathKey,
          projectionContract: name,
        });
      }
    }
  }

  for (const [pathKey, contracts] of projectionOwners) {
    if (contracts.length > 1) {
      report.projectionCollisions.push({
        path: pathKey,
        projectionContracts: contracts.sort(),
      });
    }
  }

  report.governedProjectionPaths.sort(
    (a, b) => a.path.localeCompare(b.path) || a.projectionContract.localeCompare(b.projectionContract),
  );
  report.orphanProjectionPaths.sort(
    (a, b) => a.path.localeCompare(b.path) || a.projectionContract.localeCompare(b.projectionContract),
  );
  report.projectionCollisions.sort((a, b) => a.path.localeCompare(b.path));
  return report;
}
`,
);

const replacements = [
  ["if (includesAny(normalizedName, ['order', 'fulfillment'])) return 'orders';", "if (includesAny(normalizedName, ['order', 'fulfillment', 'pickup'])) return 'orders';"],
  ['structure = mergePreparationFragment(structure);', 'structure = mergeGovernedFragments(structure);'],
  ['  if (structure.fragmentFile) fs.rmSync(structure.fragmentFile, { force: true });', '  for (const fragmentFile of structure.fragmentFiles ?? []) fs.rmSync(fragmentFile, { force: true });'],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Unable to find patch target: ${before}`);
  source = source.replace(before, after);
}

fs.writeFileSync(libraryPath, source, 'utf8');
console.log('Patched DSH OpenAPI modularization engine for governed fragments, inline references, and contract projections.');
