import fs from 'node:fs';
import path from 'node:path';

const contractsDir = 'services/wlt/contracts';
const entryPath = path.join(contractsDir, 'wlt.openapi.yaml');
const commonPath = path.join(contractsDir, 'wlt.common.openapi.yaml');
const commonReference = './wlt.common.openapi.yaml';
const commonParameters = ['Authorization', 'ServiceCaller', 'TenantId', 'CorrelationId', 'IdempotencyKey'];

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function lineIndent(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

function componentSectionBounds(lines, sectionName) {
  const components = lines.findIndex((line) => line === 'components:');
  if (components < 0) return null;
  const start = lines.findIndex((line, index) => index > components && line === `  ${sectionName}:`);
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() !== '' && lineIndent(line) <= 2) {
      end = index;
      break;
    }
  }
  return { components, start, end };
}

function componentEntries(content, sectionName) {
  const lines = content.split('\n');
  const section = componentSectionBounds(lines, sectionName);
  if (!section) return [];
  const starts = [];
  for (let index = section.start + 1; index < section.end; index += 1) {
    const match = lines[index].match(/^    ([A-Za-z0-9_.-]+):\s*(?:#.*)?$/);
    if (match) starts.push({ name: match[1], index });
  }
  return starts.map((entry, position) => ({
    name: entry.name,
    lines: lines.slice(entry.index, starts[position + 1]?.index ?? section.end),
  }));
}

function removeComponentEntry(content, sectionName, entryName) {
  const lines = content.split('\n');
  const section = componentSectionBounds(lines, sectionName);
  if (!section) return content;
  const entryStart = lines.findIndex(
    (line, index) => index > section.start && index < section.end && line === `    ${entryName}:`,
  );
  if (entryStart < 0) return content;
  let entryEnd = section.end;
  for (let index = entryStart + 1; index < section.end; index += 1) {
    const line = lines[index];
    if (line.trim() !== '' && lineIndent(line) <= 4) {
      entryEnd = index;
      break;
    }
  }
  lines.splice(entryStart, entryEnd - entryStart);

  const refreshed = componentSectionBounds(lines, sectionName);
  if (refreshed) {
    const hasEntries = lines
      .slice(refreshed.start + 1, refreshed.end)
      .some((line) => /^    [^\s#][^:]*:\s*(?:#.*)?$/.test(line));
    if (!hasEntries) lines.splice(refreshed.start, 1);
  }
  return lines.join('\n');
}

function ensureSecurityAlias(content) {
  let lines = content.split('\n');
  let components = lines.findIndex((line) => line === 'components:');
  if (components < 0) {
    while (lines.length > 0 && lines.at(-1).trim() === '') lines.pop();
    lines.push('components:');
    components = lines.length - 1;
  }
  let section = componentSectionBounds(lines, 'securitySchemes');
  if (!section) {
    lines.splice(components + 1, 0, '  securitySchemes:');
    section = componentSectionBounds(lines, 'securitySchemes');
  }
  if (!lines.slice(section.start + 1, section.end).some((line) => line === '    serviceBearer:')) {
    lines.splice(
      section.start + 1,
      0,
      '    serviceBearer:',
      `      $ref: '${commonReference}#/components/securitySchemes/serviceBearer'`,
    );
  }
  return lines.join('\n');
}

function externalizeTransportComponents(content) {
  let result = content.replaceAll('DshServiceToken', 'serviceBearer');
  result = result.replace(
    /(\$ref:\s*["']?)#\/components\/parameters\/(Authorization|ServiceCaller|TenantId|CorrelationId|IdempotencyKey)(["']?)/g,
    (_, prefix, name, suffix) => `${prefix}${commonReference}#/components/parameters/${name}${suffix}`,
  );
  result = result.replace(
    /(\$ref:\s*["']?)#\/components\/responses\/Error(["']?)/g,
    (_, prefix, suffix) => `${prefix}${commonReference}#/components/responses/Error${suffix}`,
  );
  result = result.replace(
    /(\$ref:\s*["']?)#\/components\/schemas\/Error(["']?)/g,
    (_, prefix, suffix) => `${prefix}${commonReference}#/components/schemas/Error${suffix}`,
  );

  for (const name of commonParameters) result = removeComponentEntry(result, 'parameters', name);
  result = removeComponentEntry(result, 'responses', 'Error');
  result = removeComponentEntry(result, 'schemas', 'Error');
  result = removeComponentEntry(result, 'securitySchemes', 'serviceBearer');
  return ensureSecurityAlias(result);
}

function scalarFromBlock(lines, field) {
  const pattern = new RegExp(`^\\s+${field}:\\s*([^#]+?)\\s*$`);
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

function numericConstraint(lines, field) {
  const inline = lines.join('\n').match(new RegExp(`${field}:\\s*(\\d+)`));
  return inline ? Number(inline[1]) : undefined;
}

function parseSimpleStringParameter(entry) {
  const source = entry.lines.join('\n');
  if (/\$ref:/.test(source) || /\benum:/.test(source) || /\bpattern:/.test(source) || /\bformat:/.test(source)) {
    return null;
  }
  const name = scalarFromBlock(entry.lines, 'name');
  const location = scalarFromBlock(entry.lines, 'in');
  const required = scalarFromBlock(entry.lines, 'required') ?? 'false';
  const typeMatch = source.match(/\btype:\s*string\b/);
  if (!name || !location || !typeMatch) return null;
  return {
    componentName: entry.name,
    name,
    location,
    required,
    minLength: numericConstraint(entry.lines, 'minLength'),
    maxLength: numericConstraint(entry.lines, 'maxLength'),
  };
}

function canonicalSharedParameter(name, definitions) {
  const parsed = definitions.map(({ entry }) => parseSimpleStringParameter(entry));
  if (parsed.some((value) => value === null)) return null;
  const first = parsed[0];
  if (parsed.some((value) => (
    value.componentName !== first.componentName
    || value.name !== first.name
    || value.location !== first.location
    || value.required !== first.required
  ))) return null;

  const minimums = parsed.map((value) => value.minLength).filter(Number.isFinite);
  const maximums = parsed.map((value) => value.maxLength).filter(Number.isFinite);
  const minLength = minimums.length > 0 ? Math.max(...minimums) : undefined;
  const maxLength = maximums.length > 0 ? Math.min(...maximums) : undefined;
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    throw new Error(`Incompatible WLT parameter constraints for ${name}: minLength ${minLength} exceeds maxLength ${maxLength}`);
  }
  const schemaFields = ['type: string'];
  if (minLength !== undefined) schemaFields.push(`minLength: ${minLength}`);
  if (maxLength !== undefined) schemaFields.push(`maxLength: ${maxLength}`);
  return [
    `    ${name}:`,
    `      name: ${first.name}`,
    `      in: ${first.location}`,
    `      required: ${first.required}`,
    `      schema: { ${schemaFields.join(', ')} }`,
  ];
}

function appendCommonParameters(commonContent, entries) {
  if (entries.length === 0) return commonContent;
  const lines = commonContent.split('\n');
  const section = componentSectionBounds(lines, 'parameters');
  if (!section) throw new Error('WLT common contract is missing components.parameters');
  let offset = 0;
  for (const entry of entries) {
    if (lines.slice(section.start + 1, section.end + offset).some((line) => line === `    ${entry.name}:`)) continue;
    lines.splice(section.end + offset, 0, ...entry.lines);
    offset += entry.lines.length;
  }
  return lines.join('\n');
}

let entry = read(entryPath);
if (!entry.includes(`  common: ${commonReference}\n`)) {
  entry = entry.replace('x-bthwani-contracts:\n', `x-bthwani-contracts:\n  common: ${commonReference}\n`);
}

const indexedSources = [...entry.matchAll(/^  [A-Za-z0-9_.-]+:\s+\.\/(.+\.openapi\.yaml)\s*$/gm)]
  .map((match) => match[1])
  .filter((file) => file !== 'wlt.common.openapi.yaml');
const contractPaths = [entryPath, ...indexedSources.map((source) => path.join(contractsDir, source))];
const contractContents = new Map(contractPaths.map((file) => [file, externalizeTransportComponents(read(file))]));

const parameterOwners = new Map();
for (const [file, content] of contractContents) {
  for (const parameterEntry of componentEntries(content, 'parameters')) {
    const owners = parameterOwners.get(parameterEntry.name) ?? [];
    owners.push({ file, entry: parameterEntry });
    parameterOwners.set(parameterEntry.name, owners);
  }
}

const derivedCommonParameters = [];
for (const [name, definitions] of parameterOwners) {
  if (definitions.length < 2 || commonParameters.includes(name)) continue;
  const canonical = canonicalSharedParameter(name, definitions);
  if (!canonical) continue;
  derivedCommonParameters.push({ name, lines: canonical });
  for (const [file, content] of contractContents) {
    let next = content.replace(
      new RegExp(`(\\$ref:\\s*["']?)#\\/components\\/parameters\\/${name}(["']?)`, 'g'),
      (_, prefix, suffix) => `${prefix}${commonReference}#/components/parameters/${name}${suffix}`,
    );
    next = removeComponentEntry(next, 'parameters', name);
    contractContents.set(file, next);
  }
}

derivedCommonParameters.sort((left, right) => left.name.localeCompare(right.name));
let common = appendCommonParameters(read(commonPath), derivedCommonParameters);
write(commonPath, common);
for (const [file, content] of contractContents) write(file, content);

const composerPath = 'tools/scripts/wlt-openapi-bundle-lib.mjs';
let composer = read(composerPath);
if (!composer.includes('function prepareContractForBundle(contract)')) {
  const oldGuard = `function assertInternalRefsOnly(contract) {
  for (const [lineIndex, line] of contract.lines.entries()) {
    for (const match of line.matchAll(/\\$ref:\\s*["']?([^"'\\s,}\\]]+)/g)) {
      const value = match[1];
      if (!value.startsWith('#/')) {
        throw new Error(\`${'${relative(contract.filePath)}'}:${'${lineIndex + 1}'} uses external $ref ${'${value}'}; WLT modules must be self-contained before bundling.\`);
      }
    }
  }
}
`;
  const newGuard = `function rewriteCommonReference(line) {
  return line.replace(
    /(\\$ref:\\s*["']?)\\.\\/wlt\\.common\\.openapi\\.yaml#(\\/components\\/[^"'\\s,}\\]]+)(["']?)/g,
    (_, prefix, pointer, suffix) => \`${'${prefix}'}#${'${pointer}'}${'${suffix}'}\`,
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
          \`./wlt.common.openapi.yaml#/components/securitySchemes/${'${entry.key}'}\`,
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
    for (const match of line.matchAll(/\\$ref:\\s*["']?([^"'\\s,}\\]]+)/g)) {
      const value = match[1];
      if (!value.startsWith('#/')) {
        throw new Error(\`${'${relative(contract.filePath)}'}:${'${lineIndex + 1}'} uses unsupported external $ref ${'${value}'}.\`);
      }
    }
  }
  return prepared;
}
`;
  if (!composer.includes(oldGuard)) throw new Error('VC-004 could not replace WLT external-ref guard');
  composer = composer.replace(oldGuard, newGuard);
  const oldPreparation = `  const contracts = sourceFiles.map(parseContract);
  contracts.forEach(assertInternalRefsOnly);
`;
  const newPreparation = `  const contracts = sourceFiles.map(parseContract).map(prepareContractForBundle);
`;
  if (!composer.includes(oldPreparation)) throw new Error('VC-004 could not wire WLT common reference preparation');
  composer = composer.replace(oldPreparation, newPreparation);
}
write(composerPath, composer);

console.log(
  `VC-004 centralized WLT transport components across ${indexedSources.length + 1} contracts; `
  + `${derivedCommonParameters.length} compatible shared path parameters derived.`,
);
