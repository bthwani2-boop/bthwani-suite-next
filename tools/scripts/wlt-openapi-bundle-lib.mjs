import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(__dirname, '../..');
export const contractsDirectory = path.join(repositoryRoot, 'services/wlt/contracts');
export const entryContractPath = path.join(contractsDirectory, 'wlt.openapi.yaml');
export const generatedBundlePath = path.join(contractsDirectory, 'generated/wlt.bundle.openapi.yaml');
export const generatedClientPath = path.join(repositoryRoot, 'services/wlt/clients/generated/wlt-api.ts');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function topLevelKey(line) {
  if (!line || /^\s/.test(line) || /^\s*#/.test(line)) return null;
  const match = line.match(/^([A-Za-z0-9_.-]+):(?:\s.*)?$/);
  return match?.[1] ?? null;
}

function findTopLevelSection(lines, name, startAt = 0) {
  for (let index = startAt; index < lines.length; index += 1) {
    if (topLevelKey(lines[index]) === name) return index;
  }
  return -1;
}

function findTopLevelSectionEnd(lines, start) {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (topLevelKey(lines[index])) return index;
  }
  return lines.length;
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
  return match ? decodeYamlKey(match[1]) : null;
}

function parseEntries(lines, start, end, indent, predicate = () => true) {
  const starts = [];
  for (let index = start; index < end; index += 1) {
    const key = parseKeyAtIndent(lines[index], indent);
    if (key !== null && predicate(key)) starts.push({ key, index });
  }
  return starts.map((entry, position) => ({
    key: entry.key,
    lines: lines.slice(entry.index, starts[position + 1]?.index ?? end),
  }));
}

function trimTrailingBlankLines(lines) {
  const result = [...lines];
  while (result.length > 0 && result.at(-1).trim() === '') result.pop();
  return result;
}

function stripTopLevelSection(lines, name) {
  const start = findTopLevelSection(lines, name);
  if (start === -1) return [...lines];
  const end = findTopLevelSectionEnd(lines, start);
  return [...lines.slice(0, start), ...lines.slice(end)];
}

function parseContract(filePath) {
  const lines = readText(filePath).split('\n');
  const pathsStart = findTopLevelSection(lines, 'paths');
  if (pathsStart === -1) throw new Error(`${relative(filePath)} is missing top-level paths.`);
  const pathsEnd = findTopLevelSectionEnd(lines, pathsStart);
  const componentsStart = findTopLevelSection(lines, 'components', pathsStart + 1);
  const componentsEnd = componentsStart === -1 ? -1 : findTopLevelSectionEnd(lines, componentsStart);
  const pathEntries = parseEntries(lines, pathsStart + 1, pathsEnd, 2, (key) => key.startsWith('/'));
  const componentSections = componentsStart === -1
    ? []
    : parseEntries(lines, componentsStart + 1, componentsEnd, 2).map((section) => ({
      name: section.key,
      entries: parseEntries(section.lines, 1, section.lines.length, 4),
    }));
  const documentEnd = componentsStart === -1 ? pathsEnd : componentsEnd;
  return { filePath, lines, pathEntries, componentSections, suffix: lines.slice(documentEnd) };
}

function relative(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join('/');
}

function parseIndexedContracts(entryText) {
  const lines = entryText.split('\n');
  const start = findTopLevelSection(lines, 'x-bthwani-contracts');
  if (start === -1) throw new Error('services/wlt/contracts/wlt.openapi.yaml is missing x-bthwani-contracts.');
  const end = findTopLevelSectionEnd(lines, start);
  const indexed = [];
  for (let index = start + 1; index < end; index += 1) {
    const match = lines[index].match(/^  ([A-Za-z0-9_.-]+):\s*["']?([^"'#]+)["']?\s*(?:#.*)?$/);
    if (!match) continue;
    const source = match[2].trim();
    if (!source.startsWith('./') || !source.endsWith('.openapi.yaml')) {
      throw new Error(`x-bthwani-contracts.${match[1]} must reference a local .openapi.yaml file.`);
    }
    indexed.push({ name: match[1], source });
  }
  if (indexed.length === 0) throw new Error('x-bthwani-contracts does not index any WLT modules.');
  const duplicateNames = indexed.filter((item, index) => indexed.findIndex((other) => other.name === item.name) !== index);
  const duplicateSources = indexed.filter((item, index) => indexed.findIndex((other) => other.source === item.source) !== index);
  if (duplicateNames.length > 0) throw new Error(`Duplicate WLT module names: ${[...new Set(duplicateNames.map((item) => item.name))].join(', ')}`);
  if (duplicateSources.length > 0) throw new Error(`Duplicate WLT module sources: ${[...new Set(duplicateSources.map((item) => item.source))].join(', ')}`);
  return indexed;
}

function rewriteCommonReference(line) {
  return line.replace(
    /(\$ref:\s*["']?)\.\/wlt\.common\.openapi\.yaml#(\/components\/[^"'\s,}\]]+)(["']?)/g,
    (_, prefix, pointer, suffix) => `${prefix}#${pointer}${suffix}`,
  );
}

function prepareContractForBundle(contract) {
  const mapEntry = (entry) => ({ ...entry, lines: entry.lines.map(rewriteCommonReference) });
  const componentSections = contract.componentSections.map((section) => ({
    ...section,
    entries: section.entries
      .filter((entry) => !(
        section.name === 'securitySchemes'
        && entry.lines.some((line) => line.includes(
          `./wlt.common.openapi.yaml#/components/securitySchemes/${entry.key}`,
        ))
      ))
      .map(mapEntry),
  }));
  const prepared = {
    ...contract,
    lines: contract.lines.map(rewriteCommonReference),
    pathEntries: contract.pathEntries.map(mapEntry),
    componentSections,
    suffix: contract.suffix.map(rewriteCommonReference),
  };
  const outputLines = [
    ...prepared.pathEntries.flatMap((entry) => entry.lines),
    ...prepared.componentSections.flatMap((section) => section.entries.flatMap((entry) => entry.lines)),
    ...prepared.suffix,
  ];
  for (const [lineIndex, line] of outputLines.entries()) {
    for (const match of line.matchAll(/\$ref:\s*["']?([^"'\s,}\]]+)/g)) {
      const value = match[1];
      if (!value.startsWith('#/')) {
        throw new Error(`${relative(contract.filePath)}:${lineIndex + 1} uses unsupported external $ref ${value}.`);
      }
    }
  }
  return prepared;
}

function canonicalBlock(lines) {
  return trimTrailingBlankLines(lines)
    .map((line) => line.replace(/\s+#.*$/, '').trimEnd())
    .filter((line) => line.trim() !== '')
    .join('\n');
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

function mergePathEntries(contracts) {
  const merged = new Map();
  for (const contract of contracts) {
    for (const pathEntry of contract.pathEntries) {
      let target = merged.get(pathEntry.key);
      if (!target) {
        target = {
          key: pathEntry.key,
          firstLine: pathEntry.lines[0],
          children: [],
          owners: new Map(),
        };
        merged.set(pathEntry.key, target);
      }

      const children = parseEntries(pathEntry.lines, 1, pathEntry.lines.length, 4);
      if (children.length === 0) {
        throw new Error(`WLT path ${pathEntry.key} in ${relative(contract.filePath)} has no path-item fields.`);
      }
      for (const child of children) {
        const previous = target.owners.get(child.key);
        if (previous) {
          const currentCanonical = canonicalBlock(child.lines);
          const sameDefinition = currentCanonical === previous.canonical;
          if (HTTP_METHODS.has(child.key)) {
            throw new Error(
              `WLT operation ${child.key.toUpperCase()} ${pathEntry.key} is owned by both ${relative(previous.filePath)} and ${relative(contract.filePath)}.`,
            );
          }
          if (!sameDefinition) {
            throw new Error(
              `WLT path field ${pathEntry.key}.${child.key} is defined differently by ${relative(previous.filePath)} and ${relative(contract.filePath)}.`,
            );
          }
          continue;
        }
        target.owners.set(child.key, {
          filePath: contract.filePath,
          canonical: canonicalBlock(child.lines),
        });
        target.children.push(child.lines);
      }
    }
  }
  return [...merged.values()].map((entry) => ({
    key: entry.key,
    lines: [entry.firstLine, ...entry.children.flat()],
  }));
}

function mergeUniqueEntries(contracts, selector, label, { allowIdentical = true } = {}) {
  const owners = new Map();
  const output = [];
  for (const contract of contracts) {
    for (const entry of selector(contract)) {
      const existing = owners.get(entry.key);
      if (!existing) {
        owners.set(entry.key, { contract, canonical: canonicalBlock(entry.lines) });
        output.push({ ...entry, owner: contract.filePath });
        continue;
      }
      const canonical = canonicalBlock(entry.lines);
      if (!allowIdentical || canonical !== existing.canonical) {
        const qualifier = canonical === existing.canonical ? 'is owned more than once by' : 'is defined differently by';
        throw new Error(`${label} ${entry.key} ${qualifier} ${relative(existing.contract.filePath)} and ${relative(contract.filePath)}.`);
      }
    }
  }
  return output;
}

function buildSourceDigest(sourceFiles) {
  const hash = crypto.createHash('sha256');
  for (const filePath of sourceFiles) {
    hash.update(relative(filePath));
    hash.update('\0');
    hash.update(readText(filePath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function buildBundlePrefix(entry, sourceFiles, digest) {
  const pathsStart = findTopLevelSection(entry.lines, 'paths');
  let prefix = entry.lines.slice(0, pathsStart);
  prefix = stripTopLevelSection(prefix, 'x-bthwani-contracts');
  prefix = stripTopLevelSection(prefix, 'x-bthwani-overlays');
  prefix = stripTopLevelSection(prefix, 'x-bthwani-bundle');
  prefix = stripTopLevelSection(prefix, 'x-bthwani-contract-layout');
  prefix = stripTopLevelSection(prefix, 'x-bthwani-generated-from');
  prefix = stripTopLevelSection(prefix, 'x-bthwani-source-digest');
  prefix = trimTrailingBlankLines(prefix);
  prefix.push(
    'x-bthwani-contract-layout: BUNDLED_GENERATED',
    'x-bthwani-generated-from:',
    ...sourceFiles.map((filePath) => `  - ${relative(filePath)}`),
    `x-bthwani-source-digest: ${digest}`,
    '',
  );
  return prefix;
}

export function composeWltOpenApi({ write = true } = {}) {
  const entryText = readText(entryContractPath);
  const indexed = parseIndexedContracts(entryText);
  const moduleFiles = indexed.map(({ source }) => path.resolve(contractsDirectory, source));
  for (const moduleFile of moduleFiles) {
    if (!fs.existsSync(moduleFile)) throw new Error(`Indexed WLT module is missing: ${relative(moduleFile)}`);
  }
  const sourceFiles = [entryContractPath, ...moduleFiles];
  const contracts = sourceFiles.map(parseContract).map(prepareContractForBundle);

  const operationOwners = new Map();
  for (const contract of contracts) {
    for (const entry of contract.pathEntries) {
      for (const line of entry.lines) {
        const match = line.match(/^\s*operationId:\s*([A-Za-z0-9_.-]+)\s*(?:#.*)?$/);
        if (!match) continue;
        const existing = operationOwners.get(match[1]);
        if (existing) {
          throw new Error(`operationId ${match[1]} is duplicated by ${relative(existing)} and ${relative(contract.filePath)}.`);
        }
        operationOwners.set(match[1], contract.filePath);
      }
    }
  }
  const paths = mergePathEntries(contracts);

  const sectionNames = [];
  for (const contract of contracts) {
    for (const section of contract.componentSections) {
      if (!sectionNames.includes(section.name)) sectionNames.push(section.name);
    }
  }
  const componentSections = sectionNames.map((name) => ({
    name,
    entries: mergeUniqueEntries(
      contracts,
      (contract) => contract.componentSections.find((section) => section.name === name)?.entries ?? [],
      `WLT component ${name}`,
    ),
  }));

  const digest = buildSourceDigest(sourceFiles);
  const output = [
    '# AUTO-GENERATED by tools/scripts/compose-wlt-openapi.mjs. DO NOT EDIT.',
    ...buildBundlePrefix(contracts[0], sourceFiles, digest),
    'paths:',
  ];
  for (const entry of paths) output.push(...trimTrailingBlankLines(entry.lines), '');
  output.push('components:');
  for (const section of componentSections) {
    output.push(`  ${section.name}:`);
    for (const entry of section.entries) output.push(...trimTrailingBlankLines(entry.lines), '');
  }
  if (contracts[0].suffix.length > 0) output.push('', ...contracts[0].suffix);
  const bundle = `${trimTrailingBlankLines(output).join('\n')}\n`;
  if (write) writeText(generatedBundlePath, bundle);
  return {
    bundle,
    sourceFiles: sourceFiles.map(relative),
    sourceDigest: digest,
    pathCount: paths.length,
    operationIds: [...operationOwners.keys()].sort(),
    componentCounts: Object.fromEntries(componentSections.map((section) => [section.name, section.entries.length])),
  };
}

export function verifyWltGeneratedArtifacts() {
  const expected = composeWltOpenApi({ write: false });
  const violations = [];
  if (!fs.existsSync(generatedBundlePath)) {
    violations.push(`Missing generated WLT bundle: ${relative(generatedBundlePath)}`);
  } else if (readText(generatedBundlePath) !== expected.bundle) {
    violations.push('Generated WLT bundle is stale. Run pnpm --dir services/wlt openapi:compose.');
  }
  if (!fs.existsSync(generatedClientPath)) {
    violations.push(`Missing generated WLT client: ${relative(generatedClientPath)}`);
  } else {
    const client = readText(generatedClientPath);
    if (!client.includes('This file was auto-generated by openapi-typescript.')) {
      violations.push('WLT client is not an openapi-typescript artifact. Manual generated clients are forbidden.');
    }
    for (const operationId of expected.operationIds) {
      if (!client.includes(operationId)) violations.push(`Generated WLT client is missing operationId ${operationId}.`);
    }
  }
  return { ...expected, violations };
}
