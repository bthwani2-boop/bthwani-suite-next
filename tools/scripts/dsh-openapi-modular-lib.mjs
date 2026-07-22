import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(__dirname, '../..');
export const contractsDirectory = path.join(repositoryRoot, 'services/dsh/contracts');
export const entryContractPath = path.join(contractsDirectory, 'dsh.openapi.yaml');
export const generatedBundlePath = path.join(contractsDirectory, 'generated/dsh.bundle.openapi.yaml');
export const manifestPath = path.join(contractsDirectory, 'dsh.modular.manifest.json');
export const ownershipReportPath = path.join(contractsDirectory, 'dsh.contract-ownership.json');

const PATH_DOMAINS = [
  'system',
  'discovery',
  'home-discovery',
  'catalog',
  'cart-serviceability',
  'checkout',
  'orders',
  'preparation-handoff',
  'dispatch',
  'captain',
  'partner',
  'field',
  'workforce',
  'support',
  'analytics',
  'marketing-commercial',
  'platform-policies',
  'client-address-map',
  'operator',
  'misc',
];

const SCHEMA_DOMAINS = [
  'common',
  'system',
  'store',
  'discovery',
  'catalog',
  'cart-serviceability',
  'checkout',
  'orders',
  'preparation-handoff',
  'dispatch',
  'captain',
  'partner',
  'field',
  'workforce',
  'finance-reference',
  'support',
  'analytics',
  'marketing-commercial',
  'platform-policies',
  'client-address-map',
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function ensureRelative(value) {
  if (value.startsWith('.')) return value;
  return `./${value}`;
}

function splitRef(value) {
  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) return { filePart: value, fragment: '' };
  return {
    filePart: value.slice(0, hashIndex),
    fragment: value.slice(hashIndex),
  };
}

function isAbsoluteReference(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');
}

function rewriteReferenceValue(value, fromFile, toFile, rootFile) {
  if (isAbsoluteReference(value)) return value;
  const { filePart, fragment } = splitRef(value);
  const originalTarget = filePart
    ? path.resolve(path.dirname(fromFile), filePart)
    : rootFile;
  let relative = toPosix(path.relative(path.dirname(toFile), originalTarget));
  relative = ensureRelative(relative || path.basename(originalTarget));
  return `${relative}${fragment}`;
}

function rewriteReferenceValueForBundle(value, moduleFile, rootFile) {
  if (isAbsoluteReference(value)) return value;
  const { filePart, fragment } = splitRef(value);
  const target = filePart
    ? path.resolve(path.dirname(moduleFile), filePart)
    : moduleFile;
  if (path.resolve(target) === path.resolve(rootFile)) {
    return fragment || '#';
  }
  let relative = toPosix(path.relative(path.dirname(rootFile), target));
  relative = ensureRelative(relative || path.basename(target));
  return `${relative}${fragment}`;
}

function rewriteRefs(text, transform) {
  return text
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*\$ref:\s*)(["']?)([^"'\s]+)\2(\s*(?:#.*)?)$/);
      if (!match) return line;
      const nextValue = transform(match[3]);
      const quote = match[2] || '"';
      return `${match[1]}${quote}${nextValue}${quote}${match[4]}`;
    })
    .join('\n');
}

function decodeYamlKey(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseKeyAtIndent(line, indent) {
  const prefix = ' '.repeat(indent);
  if (!line.startsWith(prefix) || line.startsWith(`${prefix} `)) return null;
  const body = line.slice(indent);
  const match = body.match(/^("[^"]+"|'[^']+'|[^:#][^:]*):\s*(?:#.*)?$/);
  if (!match) return null;
  return decodeYamlKey(match[1]);
}

function topLevelKey(line) {
  if (!line || /^\s/.test(line) || /^#/.test(line)) return null;
  const match = line.match(/^([A-Za-z0-9_.-]+):(?:\s.*)?$/);
  return match ? match[1] : null;
}

function findTopLevelSection(lines, name, startAt = 0) {
  for (let index = startAt; index < lines.length; index += 1) {
    if (lines[index] === `${name}:`) return index;
  }
  return -1;
}

function findTopLevelSectionEnd(lines, sectionStart) {
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    if (topLevelKey(lines[index])) return index;
  }
  return lines.length;
}

function parseEntries(lines, start, end, indent, predicate = () => true) {
  const starts = [];
  for (let index = start; index < end; index += 1) {
    const key = parseKeyAtIndent(lines[index], indent);
    if (key !== null && predicate(key)) starts.push({ index, key });
  }
  return starts.map((current, position) => {
    const next = starts[position + 1]?.index ?? end;
    return {
      key: current.key,
      lines: lines.slice(current.index, next),
      start: current.index,
      end: next,
    };
  });
}

function stripIndent(lines, amount) {
  const prefix = ' '.repeat(amount);
  return lines.map((line) => {
    if (!line) return '';
    if (!line.startsWith(prefix)) {
      throw new Error(`Cannot strip ${amount} spaces from line: ${line}`);
    }
    return line.slice(amount);
  });
}

function addIndent(lines, amount) {
  const prefix = ' '.repeat(amount);
  return lines.map((line) => (line ? `${prefix}${line}` : ''));
}

function trimTrailingBlankLines(lines) {
  const copy = [...lines];
  while (copy.length > 0 && copy[copy.length - 1].trim() === '') copy.pop();
  return copy;
}

function extractOperationIds(lines) {
  const operationIds = [];
  for (const line of lines) {
    const match = line.match(/^\s*operationId:\s*([A-Za-z0-9_.-]+)\s*(?:#.*)?$/);
    if (match) operationIds.push(match[1]);
  }
  return operationIds;
}

function extractTags(lines) {
  const tags = [];
  for (let index = 0; index < lines.length; index += 1) {
    const inline = lines[index].match(/^\s*tags:\s*\[([^\]]+)\]/);
    if (inline) {
      tags.push(...inline[1].split(',').map((value) => value.trim().replace(/^['"]|['"]$/g, '')));
      continue;
    }
    if (/^\s*tags:\s*$/.test(lines[index])) {
      const baseIndent = lines[index].match(/^\s*/)?.[0].length ?? 0;
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const indent = lines[cursor].match(/^\s*/)?.[0].length ?? 0;
        const tag = lines[cursor].match(/^\s*-\s*([^#]+?)\s*(?:#.*)?$/);
        if (!tag || indent <= baseIndent) break;
        tags.push(tag[1].trim().replace(/^['"]|['"]$/g, ''));
      }
    }
  }
  return tags;
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

export function classifyPath(pathKey, lines) {
  const tags = extractTags(lines).join(' ');
  const haystack = `${pathKey} ${tags}`.toLowerCase();

  if (includesAny(haystack, ['preparation', 'handoff', 'workboard'])) return 'preparation-handoff';
  if (includesAny(haystack, ['home-discovery', 'homediscovery'])) return 'home-discovery';
  if (includesAny(haystack, ['/health', '/readiness', 'dshsystem'])) return 'system';
  if (includesAny(haystack, ['catalog', 'product', 'category', 'menu', 'modifier'])) return 'catalog';
  if (includesAny(haystack, ['cart', 'serviceability'])) return 'cart-serviceability';
  if (includesAny(haystack, ['checkout'])) return 'checkout';
  if (includesAny(haystack, ['dispatch', 'tracking', 'route-plan', 'routeplan'])) return 'dispatch';
  if (includesAny(haystack, ['/captain', 'dshcaptain'])) return 'captain';
  if (includesAny(haystack, ['/field', 'dshfield'])) return 'field';
  if (includesAny(haystack, ['workforce'])) return 'workforce';
  if (includesAny(haystack, ['support', 'ticket', 'case-management'])) return 'support';
  if (includesAny(haystack, ['analytics', 'metric', 'reporting'])) return 'analytics';
  if (includesAny(haystack, ['marketing', 'commercial', 'promotion', 'campaign'])) return 'marketing-commercial';
  if (includesAny(haystack, ['platform-polic', '/policies', 'policy'])) return 'platform-policies';
  if (includesAny(haystack, ['client-address', '/addresses', '/map', 'geocode'])) return 'client-address-map';
  if (includesAny(haystack, ['/partner', 'dshpartner', 'onboarding', 'publication'])) return 'partner';
  if (includesAny(haystack, ['/orders', '/order/', 'dshorders', 'fulfillment'])) return 'orders';
  if (includesAny(haystack, ['/operator', 'operator-only'])) return 'operator';
  if (includesAny(haystack, ['discovery', '/stores'])) return 'discovery';
  return 'misc';
}

export function classifySchema(name, lines) {
  const haystack = `${name} ${lines.join(' ')}`.toLowerCase();
  const normalizedName = name.toLowerCase();

  if (includesAny(normalizedName, ['preparation', 'handoff', 'workboard'])) return 'preparation-handoff';
  if (includesAny(normalizedName, ['health', 'readiness'])) return 'system';
  if (includesAny(normalizedName, ['homediscovery', 'discovery'])) return 'discovery';
  if (includesAny(normalizedName, ['catalog', 'product', 'category', 'menu', 'modifier'])) return 'catalog';
  if (includesAny(normalizedName, ['cart', 'serviceability'])) return 'cart-serviceability';
  if (includesAny(normalizedName, ['checkout', 'quote'])) return 'checkout';
  if (includesAny(normalizedName, ['wlt', 'wallet', 'commission', 'ledger', 'payout', 'money', 'financial'])) return 'finance-reference';
  if (includesAny(normalizedName, ['dispatch', 'tracking', 'route'])) return 'dispatch';
  if (normalizedName.includes('captain')) return 'captain';
  if (normalizedName.includes('field')) return 'field';
  if (normalizedName.includes('workforce')) return 'workforce';
  if (includesAny(normalizedName, ['support', 'ticket', 'case'])) return 'support';
  if (includesAny(normalizedName, ['analytics', 'metric', 'report'])) return 'analytics';
  if (includesAny(normalizedName, ['marketing', 'commercial', 'promotion', 'campaign'])) return 'marketing-commercial';
  if (includesAny(normalizedName, ['policy', 'policies'])) return 'platform-policies';
  if (includesAny(normalizedName, ['address', 'geocode', 'map'])) return 'client-address-map';
  if (normalizedName.includes('partner')) return 'partner';
  if (includesAny(normalizedName, ['order', 'fulfillment'])) return 'orders';
  if (normalizedName.includes('store')) return 'store';
  if (includesAny(haystack, ['error response', 'correlationid', 'pagination'])) return 'common';
  return 'common';
}

function encodeJsonPointerToken(value) {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}

function parseReferenceFromBlock(lines) {
  for (const line of lines) {
    const match = line.match(/^\s*\$ref:\s*["']?([^"'\s]+)["']?\s*(?:#.*)?$/);
    if (match) return match[1];
  }
  return null;
}

function resolveReferenceFile(refValue, fromFile) {
  const { filePart } = splitRef(refValue);
  if (!filePart || isAbsoluteReference(filePart)) return null;
  return path.resolve(path.dirname(fromFile), filePart);
}

function extractFragmentKey(refValue) {
  const { fragment } = splitRef(refValue);
  if (!fragment.startsWith('#/')) return null;
  return fragment
    .slice(2)
    .split('/')
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'))
    .at(-1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function parseContractStructure(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const pathsIndex = findTopLevelSection(lines, 'paths');
  if (pathsIndex === -1) throw new Error('DSH contract is missing top-level paths section.');
  const pathsEnd = findTopLevelSectionEnd(lines, pathsIndex);
  const componentsIndex = findTopLevelSection(lines, 'components', pathsIndex + 1);
  if (componentsIndex === -1) throw new Error('DSH contract is missing top-level components section.');
  if (componentsIndex !== pathsEnd) {
    throw new Error('DSH contract must keep components as the next top-level section after paths.');
  }
  const componentsEnd = findTopLevelSectionEnd(lines, componentsIndex);
  const pathEntries = parseEntries(lines, pathsIndex + 1, componentsIndex, 2, (key) => key.startsWith('/'));
  const componentSectionEntries = parseEntries(lines, componentsIndex + 1, componentsEnd, 2);
  const componentSections = componentSectionEntries.map((section) => ({
    name: section.key,
    entries: parseEntries(lines, section.start + 1, section.end, 4),
  }));
  return {
    lines,
    prefix: lines.slice(0, pathsIndex),
    suffix: lines.slice(componentsEnd),
    pathEntries,
    componentSections,
  };
}

function parsePreparationFragment(fragmentFile) {
  if (!fs.existsSync(fragmentFile)) return { paths: [], schemas: [] };
  const lines = readText(fragmentFile).split('\n');
  const pathMarker = lines.indexOf('# @paths');
  const schemaMarker = lines.indexOf('# @schemas');
  if (pathMarker === -1 || schemaMarker === -1 || schemaMarker <= pathMarker) {
    throw new Error('Order preparation fragment must contain # @paths and # @schemas markers.');
  }
  return {
    paths: parseEntries(lines, pathMarker + 1, schemaMarker, 2, (key) => key.startsWith('/')),
    schemas: parseEntries(lines, schemaMarker + 1, lines.length, 4),
  };
}

function assertUnique(values, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) {
    throw new Error(`${label} contains duplicates: ${[...duplicates].sort().join(', ')}`);
  }
}

function moduleHeader(kind, domain) {
  return [
    `# BThwani DSH OpenAPI ${kind} module: ${domain}.`,
    '# Source of truth. Referenced by ../dsh.openapi.yaml; do not add an openapi root here.',
    '',
  ];
}

function writePathModules(pathEntries) {
  const grouped = new Map(PATH_DOMAINS.map((domain) => [domain, []]));
  for (const entry of pathEntries) {
    const domain = classifyPath(entry.key, entry.lines);
    grouped.get(domain).push(entry);
  }
  const index = new Map();
  for (const [domain, entries] of grouped) {
    if (entries.length === 0) continue;
    const moduleFile = path.join(contractsDirectory, 'paths', `${domain}.paths.yaml`);
    const body = [...moduleHeader('path-items', domain)];
    for (const entry of entries) {
      const stripped = stripIndent(trimTrailingBlankLines(entry.lines), 2).join('\n');
      const rewritten = rewriteRefs(stripped, (value) => rewriteReferenceValue(value, entryContractPath, moduleFile, entryContractPath));
      body.push(...rewritten.split('\n'), '');
      index.set(entry.key, {
        domain,
        moduleFile,
        ref: `./paths/${domain}.paths.yaml#/${encodeJsonPointerToken(entry.key)}`,
      });
    }
    writeText(moduleFile, trimTrailingBlankLines(body).join('\n'));
  }
  return { grouped, index };
}

function writeComponentModules(componentSections) {
  const sectionIndex = new Map();
  for (const section of componentSections) {
    if (section.name === 'schemas') {
      const grouped = new Map(SCHEMA_DOMAINS.map((domain) => [domain, []]));
      for (const entry of section.entries) {
        const domain = classifySchema(entry.key, entry.lines);
        grouped.get(domain).push(entry);
      }
      const itemIndex = new Map();
      for (const [domain, entries] of grouped) {
        if (entries.length === 0) continue;
        const moduleFile = path.join(contractsDirectory, 'components/schemas', `${domain}.schemas.yaml`);
        const body = [...moduleHeader('schemas', domain)];
        for (const entry of entries) {
          const stripped = stripIndent(trimTrailingBlankLines(entry.lines), 4).join('\n');
          const rewritten = rewriteRefs(stripped, (value) => rewriteReferenceValue(value, entryContractPath, moduleFile, entryContractPath));
          body.push(...rewritten.split('\n'), '');
          itemIndex.set(entry.key, {
            moduleFile,
            ref: `./components/schemas/${domain}.schemas.yaml#/${encodeJsonPointerToken(entry.key)}`,
          });
        }
        writeText(moduleFile, trimTrailingBlankLines(body).join('\n'));
      }
      sectionIndex.set(section.name, itemIndex);
      continue;
    }

    const moduleFile = path.join(contractsDirectory, 'components', `${section.name}.yaml`);
    const body = [...moduleHeader(`components/${section.name}`, section.name)];
    const itemIndex = new Map();
    for (const entry of section.entries) {
      const stripped = stripIndent(trimTrailingBlankLines(entry.lines), 4).join('\n');
      const rewritten = rewriteRefs(stripped, (value) => rewriteReferenceValue(value, entryContractPath, moduleFile, entryContractPath));
      body.push(...rewritten.split('\n'), '');
      itemIndex.set(entry.key, {
        moduleFile,
        ref: `./components/${section.name}.yaml#/${encodeJsonPointerToken(entry.key)}`,
      });
    }
    writeText(moduleFile, trimTrailingBlankLines(body).join('\n'));
    sectionIndex.set(section.name, itemIndex);
  }
  return sectionIndex;
}

function ensureModularMetadata(prefix) {
  const result = [...prefix];
  const additions = [];
  if (!result.some((line) => line.startsWith('x-bthwani-contract-layout:'))) {
    additions.push('x-bthwani-contract-layout: MODULAR');
  }
  if (!result.some((line) => line.startsWith('x-bthwani-bundle:'))) {
    additions.push('x-bthwani-bundle: ./generated/dsh.bundle.openapi.yaml');
  }
  if (additions.length === 0) return result;
  while (result.length > 0 && result[result.length - 1] === '') result.pop();
  result.push(...additions, '');
  return result;
}

function buildRootContract(prefix, suffix, pathEntries, pathIndex, componentSections, componentIndex) {
  const output = [...ensureModularMetadata(prefix), 'paths:'];
  for (const entry of pathEntries) {
    const target = pathIndex.get(entry.key);
    if (!target) throw new Error(`No path module target for ${entry.key}`);
    output.push(`  ${entry.key}:`, `    $ref: "${target.ref}"`);
  }
  output.push('', 'components:');
  for (const section of componentSections) {
    output.push(`  ${section.name}:`);
    const items = componentIndex.get(section.name);
    for (const entry of section.entries) {
      const target = items?.get(entry.key);
      if (!target) throw new Error(`No component module target for ${section.name}.${entry.key}`);
      output.push(`    ${entry.key}:`, `      $ref: "${target.ref}"`);
    }
  }
  if (suffix.length > 0) output.push('', ...suffix);
  return `${trimTrailingBlankLines(output).join('\n')}\n`;
}

function mergePreparationFragment(structure) {
  const fragmentFile = path.join(contractsDirectory, 'fragments/order-preparation-handoff.fragment.yaml');
  const fragment = parsePreparationFragment(fragmentFile);
  if (fragment.paths.length === 0 && fragment.schemas.length === 0) return { ...structure, fragmentFile: null };

  const existingPaths = new Set(structure.pathEntries.map((entry) => entry.key));
  for (const entry of fragment.paths) {
    if (existingPaths.has(entry.key)) throw new Error(`Preparation fragment path duplicates base contract path ${entry.key}`);
  }
  const schemasSection = structure.componentSections.find((section) => section.name === 'schemas');
  if (!schemasSection) throw new Error('DSH contract must contain components.schemas.');
  const existingSchemas = new Set(schemasSection.entries.map((entry) => entry.key));
  for (const entry of fragment.schemas) {
    if (existingSchemas.has(entry.key)) throw new Error(`Preparation fragment schema duplicates base schema ${entry.key}`);
  }

  return {
    ...structure,
    pathEntries: [...structure.pathEntries, ...fragment.paths],
    componentSections: structure.componentSections.map((section) =>
      section.name === 'schemas'
        ? { ...section, entries: [...section.entries, ...fragment.schemas] }
        : section,
    ),
    fragmentFile,
  };
}

function readPackageJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writePackageJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function patchPackageScripts() {
  const servicePackagePath = path.join(repositoryRoot, 'services/dsh/package.json');
  const servicePackage = readPackageJson(servicePackagePath);
  servicePackage.scripts ??= {};
  servicePackage.scripts['openapi:compose'] = 'node ../../tools/scripts/compose-dsh-openapi.mjs';
  servicePackage.scripts['openapi:generate'] = 'pnpm run openapi:compose && pnpm exec openapi-typescript contracts/generated/dsh.bundle.openapi.yaml -o clients/generated/dsh-api.ts';
  servicePackage.scripts['openapi:verify'] = 'node ../../tools/guards/dsh-openapi-modular-gate.mjs && pnpm run openapi:generate';
  writePackageJson(servicePackagePath, servicePackage);

  const rootPackagePath = path.join(repositoryRoot, 'package.json');
  const rootPackage = readPackageJson(rootPackagePath);
  rootPackage.scripts ??= {};
  rootPackage.scripts['openapi:lint:dsh'] = 'node tools/guards/dsh-openapi-modular-gate.mjs';
  rootPackage.scripts['openapi:verify:dsh'] = 'pnpm --dir services/dsh openapi:verify';
  writePackageJson(rootPackagePath, rootPackage);
}

function buildManifest(pathEntries, componentSections) {
  const operationIds = pathEntries.flatMap((entry) => extractOperationIds(entry.lines));
  const components = Object.fromEntries(componentSections.map((section) => [section.name, section.entries.length]));
  const pathDomains = {};
  for (const entry of pathEntries) {
    const domain = classifyPath(entry.key, entry.lines);
    pathDomains[domain] = (pathDomains[domain] ?? 0) + 1;
  }
  const schemaDomains = {};
  const schemas = componentSections.find((section) => section.name === 'schemas')?.entries ?? [];
  for (const entry of schemas) {
    const domain = classifySchema(entry.key, entry.lines);
    schemaDomains[domain] = (schemaDomains[domain] ?? 0) + 1;
  }
  return {
    formatVersion: 1,
    entryContract: 'services/dsh/contracts/dsh.openapi.yaml',
    generatedBundle: 'services/dsh/contracts/generated/dsh.bundle.openapi.yaml',
    pathCount: pathEntries.length,
    operationIdCount: operationIds.length,
    componentCounts: components,
    pathDomains,
    schemaDomains,
  };
}

function collectSiblingContractOwnership(currentPathKeys) {
  const report = {
    formatVersion: 1,
    sovereignContract: 'services/dsh/contracts/dsh.openapi.yaml',
    duplicatePaths: [],
    siblingContracts: {},
  };
  const current = new Set(currentPathKeys);
  for (const name of fs.readdirSync(contractsDirectory).sort()) {
    if (!name.endsWith('.openapi.yaml') || name === 'dsh.openapi.yaml') continue;
    const filePath = path.join(contractsDirectory, name);
    if (!fs.statSync(filePath).isFile()) continue;
    const text = readText(filePath);
    let structure;
    try {
      structure = parseContractStructure(text);
    } catch {
      const lines = text.split('\n');
      const pathsIndex = findTopLevelSection(lines, 'paths');
      if (pathsIndex === -1) continue;
      const end = findTopLevelSectionEnd(lines, pathsIndex);
      structure = { pathEntries: parseEntries(lines, pathsIndex + 1, end, 2, (key) => key.startsWith('/')) };
    }
    const paths = structure.pathEntries.map((entry) => entry.key);
    report.siblingContracts[name] = { pathCount: paths.length };
    for (const pathKey of paths) {
      if (current.has(pathKey)) report.duplicatePaths.push({ path: pathKey, siblingContract: name });
    }
  }
  report.duplicatePaths.sort((a, b) => a.path.localeCompare(b.path) || a.siblingContract.localeCompare(b.siblingContract));
  return report;
}

function readModuleEntry(moduleFile, key) {
  const lines = readText(moduleFile).split('\n');
  const entries = parseEntries(lines, 0, lines.length, 0);
  const entry = entries.find((candidate) => candidate.key === key);
  if (!entry) throw new Error(`Reference target ${key} was not found in ${toPosix(path.relative(repositoryRoot, moduleFile))}`);
  return entry.lines;
}

export function composeDshOpenApi({ write = true } = {}) {
  const rootText = readText(entryContractPath);
  const structure = parseContractStructure(rootText);
  const output = [...structure.prefix, 'paths:'];

  for (const rootEntry of structure.pathEntries) {
    const ref = parseReferenceFromBlock(rootEntry.lines);
    if (!ref) throw new Error(`Root path ${rootEntry.key} must contain one external $ref.`);
    const moduleFile = resolveReferenceFile(ref, entryContractPath);
    const fragmentKey = extractFragmentKey(ref);
    if (!moduleFile || !fragmentKey) throw new Error(`Unsupported path reference ${ref}`);
    const moduleLines = readModuleEntry(moduleFile, fragmentKey);
    const restored = rewriteRefs(moduleLines.join('\n'), (value) => rewriteReferenceValueForBundle(value, moduleFile, entryContractPath));
    output.push(...addIndent(trimTrailingBlankLines(restored.split('\n')), 2), '');
  }

  output.push('components:');
  for (const section of structure.componentSections) {
    output.push(`  ${section.name}:`);
    for (const rootEntry of section.entries) {
      const ref = parseReferenceFromBlock(rootEntry.lines);
      if (!ref) throw new Error(`Root component ${section.name}.${rootEntry.key} must contain one external $ref.`);
      const moduleFile = resolveReferenceFile(ref, entryContractPath);
      const fragmentKey = extractFragmentKey(ref);
      if (!moduleFile || !fragmentKey) throw new Error(`Unsupported component reference ${ref}`);
      const moduleLines = readModuleEntry(moduleFile, fragmentKey);
      const restored = rewriteRefs(moduleLines.join('\n'), (value) => rewriteReferenceValueForBundle(value, moduleFile, entryContractPath));
      output.push(...addIndent(trimTrailingBlankLines(restored.split('\n')), 4), '');
    }
  }
  if (structure.suffix.length > 0) output.push(...structure.suffix);
  const bundled = `${trimTrailingBlankLines(output).join('\n')}\n`;
  if (write) writeText(generatedBundlePath, bundled);
  return bundled;
}

function verifyReferenceTargets(structure) {
  const errors = [];
  const inspect = (label, rootEntry) => {
    const ref = parseReferenceFromBlock(rootEntry.lines);
    if (!ref) {
      errors.push(`${label} does not contain an external $ref.`);
      return;
    }
    const moduleFile = resolveReferenceFile(ref, entryContractPath);
    const fragmentKey = extractFragmentKey(ref);
    if (!moduleFile || !fragmentKey) {
      errors.push(`${label} uses unsupported reference ${ref}.`);
      return;
    }
    if (!fs.existsSync(moduleFile)) {
      errors.push(`${label} references missing file ${toPosix(path.relative(repositoryRoot, moduleFile))}.`);
      return;
    }
    try {
      const moduleLines = readModuleEntry(moduleFile, fragmentKey);
      const illegalInternalRefs = moduleLines.filter((line) => /\$ref:\s*["']?#\//.test(line));
      if (illegalInternalRefs.length > 0) {
        errors.push(`${label} module contains root-relative internal references that would resolve against the wrong document.`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  };

  for (const entry of structure.pathEntries) inspect(`paths.${entry.key}`, entry);
  for (const section of structure.componentSections) {
    for (const entry of section.entries) inspect(`components.${section.name}.${entry.key}`, entry);
  }
  return errors;
}

export function verifyDshOpenApiModular() {
  const failures = [];
  if (!fs.existsSync(entryContractPath)) failures.push('Missing DSH OpenAPI entry contract.');
  if (!fs.existsSync(manifestPath)) failures.push('Missing DSH modular manifest.');
  if (failures.length > 0) throw new Error(failures.join('\n'));

  const rootText = readText(entryContractPath);
  if (!rootText.includes('x-bthwani-contract-layout: MODULAR')) {
    failures.push('DSH entry contract is not marked with MODULAR layout metadata.');
  }
  const rootLineCount = rootText.split('\n').length;
  if (rootLineCount > 4000) failures.push(`DSH entry contract is still too large (${rootLineCount} lines).`);

  const structure = parseContractStructure(rootText);
  failures.push(...verifyReferenceTargets(structure));
  assertUnique(structure.pathEntries.map((entry) => entry.key), 'Root DSH paths');
  for (const section of structure.componentSections) {
    assertUnique(section.entries.map((entry) => entry.key), `Root components.${section.name}`);
  }

  let bundle;
  try {
    bundle = composeDshOpenApi({ write: false });
  } catch (error) {
    failures.push(`Bundle composition failed: ${error.message}`);
  }

  if (bundle) {
    const bundleStructure = parseContractStructure(bundle);
    const operationIds = bundleStructure.pathEntries.flatMap((entry) => extractOperationIds(entry.lines));
    try {
      assertUnique(operationIds, 'DSH operationId list');
    } catch (error) {
      failures.push(error.message);
    }
    const manifest = JSON.parse(readText(manifestPath));
    if (manifest.pathCount !== bundleStructure.pathEntries.length) {
      failures.push(`Manifest pathCount=${manifest.pathCount} but bundle has ${bundleStructure.pathEntries.length}.`);
    }
    if (manifest.operationIdCount !== operationIds.length) {
      failures.push(`Manifest operationIdCount=${manifest.operationIdCount} but bundle has ${operationIds.length}.`);
    }
    for (const section of bundleStructure.componentSections) {
      const expected = manifest.componentCounts?.[section.name];
      if (expected !== section.entries.length) {
        failures.push(`Manifest components.${section.name}=${expected} but bundle has ${section.entries.length}.`);
      }
    }
    if (fs.existsSync(generatedBundlePath)) {
      const existing = readText(generatedBundlePath);
      if (existing !== bundle) failures.push('Generated DSH bundle is stale; run pnpm --dir services/dsh openapi:compose.');
    }
  }

  if (fs.existsSync(ownershipReportPath)) {
    const ownership = JSON.parse(readText(ownershipReportPath));
    if ((ownership.duplicatePaths ?? []).length > 0) {
      failures.push(`DSH contract ownership has duplicate paths: ${ownership.duplicatePaths.map((item) => `${item.path} (${item.siblingContract})`).join(', ')}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`DSH OpenAPI modular gate failed:\n- ${failures.join('\n- ')}`);
  }
  return {
    pathCount: structure.pathEntries.length,
    componentSectionCount: structure.componentSections.length,
    rootLineCount,
  };
}

function writeReadme() {
  const readmePath = path.join(contractsDirectory, 'README.md');
  const content = `# DSH OpenAPI contract layout\n\n\`dsh.openapi.yaml\` is the sovereign entry contract. It contains metadata and external references only.\n\n- \`paths/*.paths.yaml\`: path items grouped by operational domain.\n- \`components/schemas/*.schemas.yaml\`: schemas grouped by domain.\n- \`components/*.yaml\`: shared parameters, responses, security schemes, and other component maps.\n- \`generated/dsh.bundle.openapi.yaml\`: deterministic monolithic bundle used for client generation and Swagger. Never edit it directly.\n- \`dsh.modular.manifest.json\`: expected path, operation, component, and domain counts.\n- \`dsh.contract-ownership.json\`: cross-contract path ownership audit.\n\n## Commands\n\n\`pnpm --dir services/dsh openapi:compose\` regenerates the bundle.\n\n\`pnpm --dir services/dsh openapi:generate\` regenerates the bundle and TypeScript client.\n\n\`pnpm --dir services/dsh openapi:verify\` validates references, uniqueness, ownership, bundle drift, and regenerates the client.\n\n## Rules\n\n1. Add each endpoint to exactly one path module.\n2. Keep every \`operationId\` globally unique.\n3. Add reusable schemas under the correct domain module and reference them through the root contract.\n4. Do not add root-relative \`#/components/...\` references inside module files; module references must point back to \`dsh.openapi.yaml\`.\n5. Do not edit generated artifacts manually.\n`;
  writeText(readmePath, content);
}

export function migrateDshOpenApi() {
  const originalText = readText(entryContractPath);
  patchPackageScripts();
  writeReadme();

  if (originalText.includes('x-bthwani-contract-layout: MODULAR')) {
    const bundle = composeDshOpenApi({ write: true });
    const structure = parseContractStructure(bundle);
    writeText(manifestPath, JSON.stringify(buildManifest(structure.pathEntries, structure.componentSections), null, 2));
    writeText(ownershipReportPath, JSON.stringify(collectSiblingContractOwnership(structure.pathEntries.map((entry) => entry.key)), null, 2));
    return verifyDshOpenApiModular();
  }

  let structure = parseContractStructure(originalText);
  structure = mergePreparationFragment(structure);

  const pathKeys = structure.pathEntries.map((entry) => entry.key);
  assertUnique(pathKeys, 'DSH paths');
  const operationIds = structure.pathEntries.flatMap((entry) => extractOperationIds(entry.lines));
  assertUnique(operationIds, 'DSH operationIds');
  for (const section of structure.componentSections) {
    assertUnique(section.entries.map((entry) => entry.key), `DSH components.${section.name}`);
  }

  const { index: pathIndex } = writePathModules(structure.pathEntries);
  const componentIndex = writeComponentModules(structure.componentSections);
  const root = buildRootContract(
    structure.prefix,
    structure.suffix,
    structure.pathEntries,
    pathIndex,
    structure.componentSections,
    componentIndex,
  );
  writeText(entryContractPath, root);
  writeText(manifestPath, JSON.stringify(buildManifest(structure.pathEntries, structure.componentSections), null, 2));
  writeText(ownershipReportPath, JSON.stringify(collectSiblingContractOwnership(pathKeys), null, 2));
  composeDshOpenApi({ write: true });

  if (structure.fragmentFile) fs.rmSync(structure.fragmentFile, { force: true });
  return verifyDshOpenApiModular();
}
