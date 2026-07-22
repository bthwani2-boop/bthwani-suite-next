import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const basePath = resolve(repositoryRoot, 'services/dsh/contracts/dsh.openapi.yaml');
const outputPath = resolve(repositoryRoot, 'services/dsh/contracts/generated/dsh.openapi.yaml');
const pathMarker = '# @paths\n';
const schemaMarker = '\n# @schemas\n';
const pickupSessionPropertiesMarker = '\n# @pickup-session-properties\n';

const fragments = [
  {
    path: resolve(
      repositoryRoot,
      'services/dsh/contracts/fragments/order-preparation-handoff.fragment.yaml',
    ),
    requiredPath: '  /dsh/partner/order-workboard:',
    requiredSchema: '    DshPartnerOrderAction:',
  },
  {
    path: resolve(
      repositoryRoot,
      'services/dsh/contracts/fragments/pickup-recovery.fragment.yaml',
    ),
    requiredPath: '  /dsh/operator/pickups/{orderId}/reschedule:',
    requiredSchema: '    DshReschedulePickupWindowRequest:',
    requiredSessionProperty: '        rescheduledAt:',
  },
];

const baseContract = readFileSync(basePath, 'utf8');

function parseFragment(spec) {
  const fragment = readFileSync(spec.path, 'utf8');
  if (!fragment.startsWith(pathMarker) || !fragment.includes(schemaMarker)) {
    throw new Error(`${spec.path} must contain exactly @paths and @schemas sections.`);
  }

  const schemaMarkerIndex = fragment.indexOf(schemaMarker);
  if (fragment.indexOf(schemaMarker, schemaMarkerIndex + schemaMarker.length) !== -1) {
    throw new Error(`${spec.path} contains duplicate @schemas markers.`);
  }

  const sessionPropertiesMarkerIndex = fragment.indexOf(pickupSessionPropertiesMarker);
  const pathSectionEnd = sessionPropertiesMarkerIndex === -1
    ? schemaMarkerIndex
    : sessionPropertiesMarkerIndex;
  if (sessionPropertiesMarkerIndex > schemaMarkerIndex) {
    throw new Error(`${spec.path} has pickup session properties after @schemas.`);
  }

  const pathSection = fragment.slice(pathMarker.length, pathSectionEnd).trimEnd();
  const sessionProperties = sessionPropertiesMarkerIndex === -1
    ? ''
    : fragment
      .slice(
        sessionPropertiesMarkerIndex + pickupSessionPropertiesMarker.length,
        schemaMarkerIndex,
      )
      .trimEnd();
  const schemaSection = fragment.slice(schemaMarkerIndex + schemaMarker.length).trimEnd();

  if (!pathSection.includes(spec.requiredPath) || !schemaSection.includes(spec.requiredSchema)) {
    throw new Error(`${spec.path} is missing its governed path or schema.`);
  }
  if (spec.requiredSessionProperty && !sessionProperties.includes(spec.requiredSessionProperty)) {
    throw new Error(`${spec.path} is missing its governed pickup session projection.`);
  }

  return { ...spec, pathSection, schemaSection, sessionProperties };
}

const parsedFragments = fragments.map(parseFragment);
for (const fragment of parsedFragments) {
  if (baseContract.includes(fragment.requiredPath) || baseContract.includes(fragment.requiredSchema)) {
    throw new Error(`${fragment.path} duplicates a governed item in the DSH base contract.`);
  }
}

const componentsAnchor = '\ncomponents:\n';
const schemasAnchor = '  schemas:\n';
if (baseContract.split(componentsAnchor).length !== 2) {
  throw new Error('DSH base contract must contain one components anchor.');
}
if (baseContract.split(schemasAnchor).length !== 2) {
  throw new Error('DSH base contract must contain one schemas anchor.');
}

const pathSections = parsedFragments.map((fragment) => fragment.pathSection).join('\n\n');
let composedContract = baseContract.replace(
  componentsAnchor,
  `\n${pathSections}\n\ncomponents:\n`,
);

const schemaSections = parsedFragments.map((fragment) => fragment.schemaSection).join('\n\n');
composedContract = composedContract.replace(
  schemasAnchor,
  `${schemasAnchor}${schemaSections}\n\n`,
);

const pickupProperties = parsedFragments
  .map((fragment) => fragment.sessionProperties)
  .filter(Boolean)
  .join('\n');
if (pickupProperties) {
  const pickupSchemaStart = composedContract.indexOf('    DshPickupSession:\n');
  const pickupSchemaEnd = composedContract.indexOf(
    '\n    DshPickupSessionResponse:',
    pickupSchemaStart,
  );
  if (pickupSchemaStart === -1 || pickupSchemaEnd === -1) {
    throw new Error('DSH base contract is missing the governed DshPickupSession schema.');
  }

  const pickupSchema = composedContract.slice(pickupSchemaStart, pickupSchemaEnd);
  const propertyAnchor = '        version: { type: integer }\n';
  if (!pickupSchema.includes(propertyAnchor)) {
    throw new Error('DshPickupSession is missing its version property anchor.');
  }
  if (pickupSchema.includes('        customerNotifiedAt:')) {
    throw new Error('Pickup lifecycle properties are duplicated in the DSH base contract.');
  }
  const updatedPickupSchema = pickupSchema.replace(
    propertyAnchor,
    `${pickupProperties}\n${propertyAnchor}`,
  );
  composedContract = `${composedContract.slice(0, pickupSchemaStart)}${updatedPickupSchema}${composedContract.slice(pickupSchemaEnd)}`;
}

for (const fragment of parsedFragments) {
  if (!composedContract.includes(fragment.requiredPath) || !composedContract.includes(fragment.requiredSchema)) {
    throw new Error(`Composed DSH contract did not contain ${fragment.path}.`);
  }
  if (fragment.requiredSessionProperty && !composedContract.includes(fragment.requiredSessionProperty)) {
    throw new Error(`Composed DSH contract did not contain ${fragment.requiredSessionProperty}.`);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, composedContract, 'utf8');
console.log(`Composed DSH OpenAPI contract: ${outputPath}`);
