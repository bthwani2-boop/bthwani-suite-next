import fs from 'node:fs';
import path from 'node:path';

const contractsDir = 'services/wlt/contracts';
const entryPath = path.join(contractsDir, 'wlt.openapi.yaml');
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
  const alias = [
    '    serviceBearer:',
    `      $ref: '${commonReference}#/components/securitySchemes/serviceBearer'`,
  ];
  lines.splice(section.start + 1, 0, ...alias);
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

let entry = read(entryPath);
if (!entry.includes(`  common: ${commonReference}\n`)) {
  entry = entry.replace('x-bthwani-contracts:\n', `x-bthwani-contracts:\n  common: ${commonReference}\n`);
}
write(entryPath, externalizeTransportComponents(entry));

const indexedSources = [...entry.matchAll(/^  [A-Za-z0-9_.-]+:\s+\.\/(.+\.openapi\.yaml)\s*$/gm)]
  .map((match) => match[1])
  .filter((file) => file !== 'wlt.common.openapi.yaml');
for (const source of indexedSources) {
  const file = path.join(contractsDir, source);
  write(file, externalizeTransportComponents(read(file)));
}

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

console.log(`VC-004 centralized WLT transport components across ${indexedSources.length + 1} contracts.`);
