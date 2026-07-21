import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const basePath = resolve(repositoryRoot, 'services/dsh/contracts/dsh.openapi.yaml');
const fragmentPath = resolve(
  repositoryRoot,
  'services/dsh/contracts/fragments/order-preparation-handoff.fragment.yaml',
);
const outputPath = resolve(repositoryRoot, 'services/dsh/contracts/generated/dsh.openapi.yaml');

const baseContract = readFileSync(basePath, 'utf8');
const fragment = readFileSync(fragmentPath, 'utf8');
const pathMarker = '# @paths\n';
const schemaMarker = '\n# @schemas\n';

if (!fragment.startsWith(pathMarker) || !fragment.includes(schemaMarker)) {
  throw new Error('DSH contract fragment must contain exactly @paths and @schemas sections.');
}

const schemaMarkerIndex = fragment.indexOf(schemaMarker);
if (fragment.indexOf(schemaMarker, schemaMarkerIndex + schemaMarker.length) !== -1) {
  throw new Error('DSH contract fragment contains duplicate @schemas markers.');
}

const pathSection = fragment.slice(pathMarker.length, schemaMarkerIndex).trimEnd();
const schemaSection = fragment.slice(schemaMarkerIndex + schemaMarker.length).trimEnd();

const requiredPath = '  /dsh/partner/order-workboard:';
const requiredSchema = '    DshPartnerOrderAction:';
if (!pathSection.includes(requiredPath) || !schemaSection.includes(requiredSchema)) {
  throw new Error('Order preparation fragment is missing its governed path or action schema.');
}
if (baseContract.includes(requiredPath) || baseContract.includes(requiredSchema)) {
  throw new Error('Order preparation contract is duplicated in the DSH base contract.');
}

const componentsAnchor = '\ncomponents:\n';
const schemasAnchor = '  schemas:\n';
if (baseContract.split(componentsAnchor).length !== 2) {
  throw new Error('DSH base contract must contain one components anchor.');
}
if (baseContract.split(schemasAnchor).length !== 2) {
  throw new Error('DSH base contract must contain one schemas anchor.');
}

const withPaths = baseContract.replace(
  componentsAnchor,
  `\n${pathSection}\n\ncomponents:\n`,
);
const composedContract = withPaths.replace(
  schemasAnchor,
  `${schemasAnchor}${schemaSection}\n\n`,
);

if (!composedContract.includes(requiredPath) || !composedContract.includes(requiredSchema)) {
  throw new Error('Composed DSH contract did not contain the order preparation fragment.');
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, composedContract, 'utf8');
console.log(`Composed DSH OpenAPI contract: ${outputPath}`);
